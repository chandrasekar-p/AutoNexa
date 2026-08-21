import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { InvoiceStatus, JobCardStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../prisma/tenant-context';
import { generateSequenceNumber } from '../../common/sequence/generate-sequence-number';
import { rollupPaymentStatus } from '../../common/billing/rollup-payment-status';
import { MessagingService } from '../messaging/messaging.service';
import { invoiceIssuedMessage, paymentReceivedMessage } from '../messaging/templates';
import { UPLOAD_ROOT } from '../uploads/upload-storage';
import { calculateGstSplit, computeRoundOff, GstSplitLineItem } from './gst-split';
import { isOverpayment } from './payment-guard';
import { buildInvoicePdf } from './invoice-pdf';
import { CreateInvoicePaymentDto } from './dto/create-invoice-payment.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';

const CUSTOMER_SUMMARY_SELECT = { id: true, name: true, mobile: true, email: true, state: true } as const;
const INVOICE_INCLUDE = {
  customer: { select: CUSTOMER_SUMMARY_SELECT },
  jobCard: { select: { id: true, jobCardNumber: true } },
  lineItems: true,
  payments: { orderBy: { paymentDate: 'desc' as const } },
};
const GENERATABLE_STATUSES: JobCardStatus[] = [JobCardStatus.READY_FOR_DELIVERY, JobCardStatus.DELIVERED];
const INVOICE_STATUSES = {
  unpaid: InvoiceStatus.UNPAID,
  partiallyPaid: InvoiceStatus.PARTIALLY_PAID,
  paid: InvoiceStatus.PAID,
};

interface InvoiceLineItemInput extends GstSplitLineItem {
  description: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  hsnSac: string | null;
}

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
  ) {}

  /**
   * Called from JobCardsService.generateInvoice, the public entry point
   * being POST /job-cards/:id/generate-invoice — not its own /invoices
   * route, matching the Estimate -> JobCard conversion's shape.
   */
  async generateFromJobCard(jobCardId: string) {
    const db = this.prisma.forTenant();

    const jobCard = await db.jobCard.findFirst({ where: { id: jobCardId, deletedAt: null } });
    if (!jobCard) throw new NotFoundException('Job card not found');

    if (!GENERATABLE_STATUSES.includes(jobCard.status)) {
      throw new BadRequestException(
        'Job card must be READY_FOR_DELIVERY or DELIVERED to generate an invoice',
      );
    }

    const existing = await db.invoice.findFirst({ where: { jobCardId } });
    if (existing) throw new ConflictException('An invoice already exists for this job card');

    const tenantId = TenantContext.requireTenantId();

    // Snapshotted from JobCardLabour/JobCardPart — never a live re-read of
    // Part/LabourItem pricing (those rows were themselves already
    // snapshotted at add time; this just carries that forward).
    const [customer, tenantSettings, labourLines, partLines] = await Promise.all([
      db.customer.findFirstOrThrow({ where: { id: jobCard.customerId } }),
      db.tenantSettings.findUniqueOrThrow({ where: { tenantId } }),
      db.jobCardLabour.findMany({ where: { jobCardId }, include: { labourItem: { select: { description: true } } } }),
      db.jobCardPart.findMany({ where: { jobCardId }, include: { part: { select: { partNumber: true, name: true } } } }),
    ]);

    const lineItemInputs: InvoiceLineItemInput[] = [
      ...labourLines.map((l) => ({
        description: l.description ?? l.labourItem?.description ?? 'Labour',
        quantity: l.hours,
        unitPrice: l.rate,
        gstRate: l.gstRate,
        hsnSac: l.hsnSac,
        lineTotal: l.lineTotal,
      })),
      ...partLines.map((p) => ({
        description: `${p.part.partNumber} — ${p.part.name}`,
        quantity: new Prisma.Decimal(p.quantity),
        unitPrice: p.unitPrice,
        gstRate: p.gstRate,
        hsnSac: p.hsnSac,
        lineTotal: p.lineTotal,
      })),
    ];

    if (lineItemInputs.length === 0) {
      throw new BadRequestException('Job card has no labour or parts to invoice');
    }

    const { subtotal, cgstAmount, sgstAmount, igstAmount } = calculateGstSplit(
      lineItemInputs,
      tenantSettings.state,
      customer.state,
    );
    const unroundedGrandTotal = subtotal.add(cgstAmount).add(sgstAmount).add(igstAmount);
    const { roundOff, grandTotal } = computeRoundOff(unroundedGrandTotal);

    const invoice = await db.$transaction(async (tx) => {
      // Cast needed because `tx` here is forTenant()'s extended-client
      // transaction type, structurally distinct from the generated
      // Prisma.TransactionClient type generateSequenceNumber expects —
      // functionally identical at runtime (verified in job-cards.service.ts).
      const invoiceNumber = await generateSequenceNumber(
        tx as unknown as Prisma.TransactionClient,
        tenantId,
        'INVOICE',
        tenantSettings.invoicePrefix,
      );

      const created = await tx.invoice.create({
        data: {
          customerId: jobCard.customerId,
          jobCardId,
          invoiceNumber,
          subtotal,
          cgstAmount,
          sgstAmount,
          igstAmount,
          roundOff,
          grandTotal,
          status: InvoiceStatus.UNPAID,
        } as unknown as Prisma.InvoiceUncheckedCreateInput,
      });

      await tx.invoiceLineItem.createMany({
        data: lineItemInputs.map((item) => ({
          invoiceId: created.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          gstRate: item.gstRate,
          hsnSac: item.hsnSac,
          lineTotal: item.lineTotal,
        })) as unknown as Prisma.InvoiceLineItemCreateManyInput[],
      });

      return created;
    });

    await this.sendInvoiceIssued(tenantId, customer, invoice.id, invoice.invoiceNumber, grandTotal);

    return this.findOne(invoice.id);
  }

  /** Best-effort — see MessagingService.notifyCustomer's doc comment on why this never throws. */
  private async sendInvoiceIssued(
    tenantId: string,
    customer: { name: string; mobile: string; email: string | null },
    invoiceId: string,
    invoiceNumber: string,
    grandTotal: Prisma.Decimal,
  ) {
    const tenant = await this.prisma.platform.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    const content = invoiceIssuedMessage({
      workshopName: tenant?.name ?? 'AutoNexa',
      customerName: customer.name,
      invoiceNumber,
      grandTotal: `₹${Number(grandTotal).toFixed(2)}`,
    });

    await this.messaging.notifyCustomer(
      tenantId,
      'invoice.issued',
      { email: customer.email, mobile: customer.mobile },
      content,
      { type: 'Invoice', id: invoiceId },
    );

    await this.messaging.notifyOps(
      tenantId,
      'invoice.issued',
      `Invoice ${invoiceNumber} issued: ${customer.name} — ₹${Number(grandTotal).toFixed(2)}`,
      { type: 'Invoice', id: invoiceId },
    );
  }

  async findAll(query: ListInvoicesQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const db = this.prisma.forTenant();

    const where = {
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { invoiceNumber: { contains: query.search, mode: 'insensitive' as const } } : {}),
    };

    const [items, total] = await Promise.all([
      db.invoice.findMany({
        where,
        include: { customer: { select: CUSTOMER_SUMMARY_SELECT } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.invoice.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string) {
    const invoice = await this.prisma.forTenant().invoice.findFirst({
      where: { id },
      include: INVOICE_INCLUDE,
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  /**
   * Manual send/resend — unlike sendInvoiceIssued (fired once, automatically,
   * at generation), this is user-triggered from the invoice page and emails
   * an actual PDF attachment rather than a text-only notification. SMS/
   * WhatsApp still get the same short text as the automatic notification —
   * building a document those channels could carry is out of scope (see the
   * phase write-up). Returns what was actually attempted so the frontend can
   * tell the user whether it worked, not just fire-and-forget.
   */
  async resend(id: string) {
    const invoice = await this.findOne(id);
    const tenantId = TenantContext.requireTenantId();
    const [tenant, settings] = await Promise.all([
      this.prisma.platform.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
      this.prisma.platform.tenantSettings.findUnique({ where: { tenantId } }),
    ]);
    const workshopName = tenant?.name ?? 'AutoNexa';

    const content = invoiceIssuedMessage({
      workshopName,
      customerName: invoice.customer.name,
      invoiceNumber: invoice.invoiceNumber,
      grandTotal: `₹${Number(invoice.grandTotal).toFixed(2)}`,
    });

    const pdfBuffer = await buildInvoicePdf({
      workshopName,
      logoBuffer: await this.readLogoBuffer(settings?.logoUrl ?? null),
      invoiceNumber: invoice.invoiceNumber,
      createdAt: invoice.createdAt,
      customerName: invoice.customer.name,
      customerMobile: invoice.customer.mobile,
      lineItems: invoice.lineItems.map((item) => ({
        description: item.description,
        hsnSac: item.hsnSac,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        gstRate: item.gstRate.toString(),
        lineTotal: item.lineTotal.toString(),
      })),
      subtotal: invoice.subtotal.toString(),
      cgstAmount: invoice.cgstAmount.toString(),
      sgstAmount: invoice.sgstAmount.toString(),
      igstAmount: invoice.igstAmount.toString(),
      roundOff: invoice.roundOff.toString(),
      grandTotal: invoice.grandTotal.toString(),
    });

    const attempts = await this.messaging.notifyCustomer(
      tenantId,
      'invoice.resent',
      { email: invoice.customer.email, mobile: invoice.customer.mobile },
      content,
      { type: 'Invoice', id },
      [{ filename: `${invoice.invoiceNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
    );

    // `id` in the response (not just `attempts`) is deliberate — the audit
    // interceptor reads `.id` off every @Audit()-tagged response to fill
    // `entityId` (see audit-log.interceptor.ts); without it every resend
    // would log as entityId "unknown", the same bug fixed once already this
    // build in adminSetPassword.
    return { id, attempts };
  }

  /** `logoUrl` is a relative `/uploads/<tenantId>/<uuid>.ext` path (see upload-storage.ts) — resolved straight off local disk, not over HTTP, since this runs in the same process that serves it. */
  private async readLogoBuffer(logoUrl: string | null): Promise<Buffer | null> {
    if (!logoUrl) return null;
    try {
      return await readFile(join(UPLOAD_ROOT, logoUrl.replace(/^\/uploads\//, '')));
    } catch {
      return null;
    }
  }

  async recordPayment(invoiceId: string, dto: CreateInvoicePaymentDto) {
    const invoice = await this.assertExists(invoiceId);
    const db = this.prisma.forTenant();

    const existingPayments = await db.payment.findMany({ where: { invoiceId } });
    const totalPaidSoFar = existingPayments.reduce((sum, p) => sum.add(p.amount), new Prisma.Decimal(0));

    if (isOverpayment(totalPaidSoFar, invoice.grandTotal, dto.amount)) {
      throw new BadRequestException('Payment would exceed the invoice grand total');
    }

    await db.payment.create({
      data: {
        invoiceId,
        amount: dto.amount,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : undefined,
        method: dto.method,
        referenceNumber: dto.referenceNumber,
      } as unknown as Prisma.PaymentUncheckedCreateInput,
    });

    const updated = await this.recalculateStatus(invoiceId);
    await this.sendPaymentReceived(updated, dto.amount);
    return updated;
  }

  /** Best-effort — see MessagingService.notifyCustomer's doc comment on why this never throws. */
  private async sendPaymentReceived(
    invoice: {
      id: string;
      invoiceNumber: string;
      customer: { name: string; mobile: string; email: string | null };
    },
    amount: number,
  ) {
    const tenantId = TenantContext.requireTenantId();
    const tenant = await this.prisma.platform.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    const content = paymentReceivedMessage({
      workshopName: tenant?.name ?? 'AutoNexa',
      customerName: invoice.customer.name,
      invoiceNumber: invoice.invoiceNumber,
      amount: `₹${Number(amount).toFixed(2)}`,
    });

    await this.messaging.notifyCustomer(
      tenantId,
      'payment.received',
      { email: invoice.customer.email, mobile: invoice.customer.mobile },
      content,
      { type: 'Invoice', id: invoice.id },
    );

    await this.messaging.notifyOps(
      tenantId,
      'payment.received',
      `Payment received: ${invoice.customer.name} — ₹${Number(amount).toFixed(2)} against ${invoice.invoiceNumber}`,
      { type: 'Invoice', id: invoice.id },
    );
  }

  /** Called after every payment recorded against this invoice. */
  async recalculateStatus(id: string) {
    const db = this.prisma.forTenant();
    const [invoice, payments] = await Promise.all([
      db.invoice.findFirstOrThrow({ where: { id } }),
      db.payment.findMany({ where: { invoiceId: id } }),
    ]);

    const totalPaid = payments.reduce((sum, p) => sum.add(p.amount), new Prisma.Decimal(0));
    const status = rollupPaymentStatus(totalPaid, invoice.grandTotal, INVOICE_STATUSES);

    return db.invoice.update({
      where: { id },
      data: { status },
      include: INVOICE_INCLUDE,
    });
  }

  private async assertExists(id: string) {
    const invoice = await this.prisma.forTenant().invoice.findFirst({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }
}
