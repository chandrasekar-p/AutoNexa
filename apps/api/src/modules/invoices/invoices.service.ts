import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, JobCardStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../prisma/tenant-context';
import { generateSequenceNumber } from '../../common/sequence/generate-sequence-number';
import { rollupPaymentStatus } from '../../common/billing/rollup-payment-status';
import { calculateGstSplit, computeRoundOff, GstSplitLineItem } from './gst-split';
import { isOverpayment } from './payment-guard';
import { CreateInvoicePaymentDto } from './dto/create-invoice-payment.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';

const CUSTOMER_SUMMARY_SELECT = { id: true, name: true, mobile: true, state: true } as const;
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
  constructor(private readonly prisma: PrismaService) {}

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

    return this.findOne(invoice.id);
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

    return this.recalculateStatus(invoiceId);
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
