import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, JobCardStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../prisma/tenant-context';
import { generateSequenceNumber } from '../../common/sequence/generate-sequence-number';
import { rollupPaymentStatus } from '../../common/billing/rollup-payment-status';
import { MessagingService } from '../messaging/messaging.service';
import { invoiceIssuedMessage, paymentReceivedMessage, pointsEarnedMessage } from '../messaging/templates';
import { STORAGE_SERVICE, StorageService } from '../storage/storage.types';
import { isLabourCoveredByPackage, isPartCoveredByPackage, PackageInclusions } from '../service-packages/package-coverage';
import { isLineFreeUnderWarrantyClaim } from '../warranty/warranty-claim-coverage';
import { hasSufficientPoints, computePointsEarned, computeRedemptionValue } from '../loyalty/loyalty-eligibility';
import { adjustLoyaltyBalance } from '../loyalty/loyalty-ledger';
import { calculateGstSplit, computeRoundOff, GstSplitLineItem } from './gst-split';
import { applyProRataDiscount } from './discount';
import { isOverpayment } from './payment-guard';
import { buildInvoicePdf } from './invoice-pdf';
import { CreateInvoicePaymentDto } from './dto/create-invoice-payment.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import { GenerateInvoiceDto } from '../job-cards/dto/generate-invoice.dto';

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
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  /**
   * Called from JobCardsService.generateInvoice, the public entry point
   * being POST /job-cards/:id/generate-invoice — not its own /invoices
   * route, matching the Estimate -> JobCard conversion's shape.
   */
  async generateFromJobCard(jobCardId: string, dto: GenerateInvoiceDto = {}) {
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
      db.jobCardPart.findMany({ where: { jobCardId }, include: { part: { select: { partNumber: true, name: true, categoryId: true } } } }),
    ]);

    // Lines covered by a redeemed package OR a non-billable warranty claim
    // are excluded from the invoice entirely — they never reach
    // calculateGstSplit, so neither contributes incremental tax (the
    // package's GST was already charged in full at sale time; a warranty
    // fix isn't a new sale at all). They stay on the job card at full
    // snapshotted value for the service record. See package-coverage.ts
    // and warranty-claim-coverage.ts's doc comments for why each kind of
    // coverage is determined differently (derived-from-template vs
    // explicitly-tagged).
    const inclusions = await this.loadPackageInclusions(jobCard.redeemedPackageId);
    const isBillableByClaimId = await this.loadClaimBillability([...labourLines, ...partLines]);
    const chargeableLabourLines = labourLines.filter(
      (l) => !(inclusions && isLabourCoveredByPackage(l.labourItemId, inclusions)) && !isLineFreeUnderWarrantyClaim(l.warrantyClaimId, isBillableByClaimId),
    );
    const chargeablePartLines = partLines.filter(
      (p) =>
        !(inclusions && isPartCoveredByPackage(p.partId, p.part.categoryId, inclusions)) &&
        !isLineFreeUnderWarrantyClaim(p.warrantyClaimId, isBillableByClaimId),
    );

    const lineItemInputs: InvoiceLineItemInput[] = [
      ...chargeableLabourLines.map((l) => ({
        description: l.description ?? l.labourItem?.description ?? 'Labour',
        quantity: l.hours,
        unitPrice: l.rate,
        gstRate: l.gstRate,
        hsnSac: l.hsnSac,
        lineTotal: l.lineTotal,
      })),
      ...chargeablePartLines.map((p) => ({
        description: `${p.part.partNumber} — ${p.part.name}`,
        quantity: new Prisma.Decimal(p.quantity),
        unitPrice: p.unitPrice,
        gstRate: p.gstRate,
        hsnSac: p.hsnSac,
        lineTotal: p.lineTotal,
      })),
    ];

    if (lineItemInputs.length === 0) {
      throw new BadRequestException(
        inclusions || isBillableByClaimId.size > 0
          ? 'Everything on this job card is covered by the redeemed package or a free warranty claim — nothing left to invoice'
          : 'Job card has no labour or parts to invoice',
      );
    }

    const loyaltyPointsRedeemed = dto.redeemLoyaltyPoints ?? 0;
    const loyaltyDiscountAmount = loyaltyPointsRedeemed > 0 ? await this.resolveLoyaltyDiscount(tenantSettings, jobCard.customerId, loyaltyPointsRedeemed, lineItemInputs) : new Prisma.Decimal(0);

    const invoice = await db.$transaction(async (tx) => {
      const created = await this.createInvoiceInTransaction(tx as unknown as Prisma.TransactionClient, {
        tenantId,
        tenantSettings,
        customerId: jobCard.customerId,
        customerState: customer.state,
        jobCardId,
        lineItemInputs,
        loyaltyPointsRedeemed,
        loyaltyDiscountAmount,
      });
      // Balance already pre-validated by resolveLoyaltyDiscount above —
      // this guarded adjustment is the concurrency-safe backstop for the
      // rare concurrent-redemption race, not the primary check. Runs
      // AFTER invoice creation so the ledger row can reference the real
      // invoice id directly; if it fails, the whole transaction (invoice
      // included) rolls back together.
      if (loyaltyPointsRedeemed > 0) {
        await adjustLoyaltyBalance(tx as unknown as Prisma.TransactionClient, jobCard.customerId, -loyaltyPointsRedeemed, {
          invoiceId: created.id,
          type: 'REDEEMED',
        });
      }
      return created;
    });

    await this.sendInvoiceIssued(tenantId, customer, invoice.id, invoice.invoiceNumber, invoice.grandTotal);

    return this.findOne(invoice.id);
  }

  /** Null when the job card redeems no package — every caller checks this before treating any line as covered. */
  private async loadPackageInclusions(redeemedPackageId: string | null): Promise<PackageInclusions | null> {
    if (!redeemedPackageId) return null;
    const pkg = await this.prisma.forTenant().customerServicePackage.findUnique({
      where: { id: redeemedPackageId },
      include: { servicePackage: { include: { includedLabourItems: true, includedParts: true, includedPartCategories: true } } },
    });
    if (!pkg) return null;
    return {
      labourItemIds: new Set(pkg.servicePackage.includedLabourItems.map((i) => i.labourItemId)),
      partIds: new Set(pkg.servicePackage.includedParts.map((i) => i.partId)),
      partCategoryIds: new Set(pkg.servicePackage.includedPartCategories.map((i) => i.partCategoryId)),
    };
  }

  /** Empty map when no line on this job card is tagged against a claim — the common case, no extra query beyond the initial findMany([]).*/
  private async loadClaimBillability(lines: { warrantyClaimId: string | null }[]): Promise<Map<string, boolean>> {
    const claimIds = [...new Set(lines.map((l) => l.warrantyClaimId).filter((id): id is string => id !== null))];
    if (claimIds.length === 0) return new Map();

    const claims = await this.prisma.forTenant().warrantyClaim.findMany({ where: { id: { in: claimIds } }, select: { id: true, isBillable: true } });
    return new Map(claims.map((c) => [c.id, c.isBillable]));
  }

  /** Validates a requested points redemption against both the customer's balance and this invoice's own subtotal, returning the rupee discount to apply — never silently caps, rejects outright so a customer never "loses" points to an over-request. */
  private async resolveLoyaltyDiscount(
    tenantSettings: { loyaltyEnabled: boolean; loyaltyPointValueRupees: Prisma.Decimal },
    customerId: string,
    requestedPoints: number,
    lineItemInputs: GstSplitLineItem[],
  ): Promise<Prisma.Decimal> {
    if (!tenantSettings.loyaltyEnabled) throw new BadRequestException('Loyalty program is not enabled for this workshop');

    const customer = await this.prisma.forTenant().customer.findFirstOrThrow({ where: { id: customerId } });
    if (!hasSufficientPoints(customer.loyaltyPointsBalance, requestedPoints)) {
      throw new BadRequestException('Requested points exceed the customer\'s loyalty balance');
    }

    const discount = computeRedemptionValue(requestedPoints, tenantSettings.loyaltyPointValueRupees);
    const subtotal = lineItemInputs.reduce((sum, item) => sum.add(item.lineTotal), new Prisma.Decimal(0));
    if (discount.gt(subtotal)) {
      throw new BadRequestException('Requested points are worth more than this invoice\'s subtotal — redeem fewer points');
    }
    return discount;
  }


  /**
   * Public — called from within CustomerServicePackagesService.sell()'s
   * OWN transaction, so a package sale and the invoice that pays for it
   * are created atomically together (never a phantom invoice with no
   * linked package, or vice versa). Same core generateFromJobCard uses
   * for job-card invoices, just with `jobCardId: null` and a single
   * synthetic line item instead of JobCardLabour/Part-derived ones —
   * Invoice.jobCardId has been nullable since Phase 7 specifically for
   * this kind of non-job-card invoicing.
   */
  async createInvoiceInTransaction(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      tenantSettings: { state: string | null; invoicePrefix: string };
      customerId: string;
      customerState: string | null;
      jobCardId: string | null;
      lineItemInputs: InvoiceLineItemInput[];
      loyaltyPointsRedeemed?: number;
      loyaltyDiscountAmount?: Prisma.Decimal;
    },
  ) {
    const discountedLines = params.loyaltyDiscountAmount?.gt(0) ? applyProRataDiscount(params.lineItemInputs, params.loyaltyDiscountAmount) : params.lineItemInputs;

    const { subtotal, cgstAmount, sgstAmount, igstAmount } = calculateGstSplit(discountedLines, params.tenantSettings.state, params.customerState);
    const unroundedGrandTotal = subtotal.add(cgstAmount).add(sgstAmount).add(igstAmount);
    const { roundOff, grandTotal } = computeRoundOff(unroundedGrandTotal);

    const invoiceNumber = await generateSequenceNumber(tx, params.tenantId, 'INVOICE', params.tenantSettings.invoicePrefix);

    const created = await tx.invoice.create({
      data: {
        customerId: params.customerId,
        jobCardId: params.jobCardId,
        invoiceNumber,
        subtotal,
        cgstAmount,
        sgstAmount,
        igstAmount,
        roundOff,
        grandTotal,
        loyaltyPointsRedeemed: params.loyaltyPointsRedeemed ?? 0,
        loyaltyDiscountAmount: params.loyaltyDiscountAmount ?? 0,
        status: InvoiceStatus.UNPAID,
      } as unknown as Prisma.InvoiceUncheckedCreateInput,
    });

    await tx.invoiceLineItem.createMany({
      data: discountedLines.map((item) => ({
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
  }

  /** Best-effort — see MessagingService.notifyCustomer's doc comment on why this never throws. Public: also called from CustomerServicePackagesService.sell() after a package-sale invoice is created. */
  async sendInvoiceIssued(
    tenantId: string,
    customer: { id: string; name: string; mobile: string; email: string | null },
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
      { email: customer.email, mobile: customer.mobile, customerId: customer.id },
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
    const { workshopName, pdfBuffer } = await this.buildInvoicePdfBuffer(invoice);

    const content = invoiceIssuedMessage({
      workshopName,
      customerName: invoice.customer.name,
      invoiceNumber: invoice.invoiceNumber,
      grandTotal: `₹${Number(invoice.grandTotal).toFixed(2)}`,
    });

    const attempts = await this.messaging.notifyCustomer(
      tenantId,
      'invoice.resent',
      { email: invoice.customer.email, mobile: invoice.customer.mobile, customerId: invoice.customer.id },
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

  /**
   * Direct browser download — for the "no Email/SMS/WhatsApp configured,
   * how does the owner actually get the invoice" gap: resend() only ever
   * puts the PDF in an outbound message, with nothing to show if every
   * channel is unconfigured or the customer has no email/mobile on file.
   * This bypasses messaging entirely and just hands back the same PDF
   * bytes resend() would have attached, for the controller to stream as
   * a file response.
   */
  async downloadPdf(id: string): Promise<{ fileName: string; buffer: Buffer }> {
    const invoice = await this.findOne(id);
    const { pdfBuffer } = await this.buildInvoicePdfBuffer(invoice);
    return { fileName: `${invoice.invoiceNumber}.pdf`, buffer: pdfBuffer };
  }

  private async buildInvoicePdfBuffer(
    invoice: Awaited<ReturnType<InvoicesService['findOne']>>,
  ): Promise<{ workshopName: string; pdfBuffer: Buffer }> {
    const tenantId = TenantContext.requireTenantId();
    const [tenant, settings] = await Promise.all([
      this.prisma.platform.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
      this.prisma.platform.tenantSettings.findUnique({ where: { tenantId } }),
    ]);
    const workshopName = tenant?.name ?? 'AutoNexa';

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

    return { workshopName, pdfBuffer };
  }

  /** `logoUrl` is a stored key (see storage.types.ts) — fetched as raw bytes via StorageService.getBuffer, never a signed URL round-trip, since this runs server-side and needs to hand PDFKit actual image bytes. */
  private async readLogoBuffer(logoUrl: string | null): Promise<Buffer | null> {
    if (!logoUrl) return null;
    try {
      return await this.storage.getBuffer(logoUrl);
    } catch {
      return null;
    }
  }

  async recordPayment(invoiceId: string, dto: CreateInvoicePaymentDto) {
    return this.applyPayment(invoiceId, {
      amount: dto.amount,
      paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : undefined,
      method: dto.method,
      referenceNumber: dto.referenceNumber,
    });
  }

  /**
   * Called only from PaymentsGatewayService, inside a TenantContext.run()
   * block it establishes itself after resolving the tenant from
   * Invoice.pendingGatewayOrderId (a webhook has no tenant context of its
   * own — see the payment gateway architecture doc §3.2). Everything below
   * this point — applyPayment, recalculateStatus, sendPaymentReceived — is
   * identical to the manual recordPayment path; a gateway-captured payment
   * gets the exact same overpayment guard and status rollup, not a
   * parallel implementation.
   */
  async applyCapturedPayment(
    invoiceId: string,
    gateway: { amount: number; providerOrderId: string; providerPaymentId: string; providerSignature: string },
  ) {
    return this.applyPayment(invoiceId, {
      amount: gateway.amount,
      method: 'razorpay',
      provider: 'razorpay',
      providerOrderId: gateway.providerOrderId,
      providerPaymentId: gateway.providerPaymentId,
      providerSignature: gateway.providerSignature,
    });
  }

  private async applyPayment(
    invoiceId: string,
    data: {
      amount: Prisma.Decimal | number;
      method: string;
      paymentDate?: Date;
      referenceNumber?: string;
      provider?: string;
      providerOrderId?: string;
      providerPaymentId?: string;
      providerSignature?: string;
    },
  ) {
    const invoice = await this.assertExists(invoiceId);
    const db = this.prisma.forTenant();

    const existingPayments = await db.payment.findMany({ where: { invoiceId } });
    const totalPaidSoFar = existingPayments.reduce((sum, p) => sum.add(p.amount), new Prisma.Decimal(0));

    if (isOverpayment(totalPaidSoFar, invoice.grandTotal, data.amount)) {
      throw new BadRequestException('Payment would exceed the invoice grand total');
    }

    await db.payment.create({
      data: { invoiceId, ...data } as unknown as Prisma.PaymentUncheckedCreateInput,
    });

    const wasAlreadyPaid = invoice.status === InvoiceStatus.PAID;
    const updated = await this.recalculateStatus(invoiceId);
    await this.sendPaymentReceived(updated, Number(data.amount));

    // Earn on "just became fully paid," not on generation — an unpaid or
    // cancelled invoice earns nothing. `wasAlreadyPaid` guards against
    // double-earning if this is ever reached again on an already-paid
    // invoice (e.g. a zero-amount reconciliation entry).
    if (!wasAlreadyPaid && updated.status === InvoiceStatus.PAID) {
      await this.earnLoyaltyPoints(updated);
    }
    return updated;
  }

  /**
   * Best-effort in the messaging sense (see MessagingService's doc comment)
   * but the ledger write itself must not silently fail — a caught/logged
   * error here would mean a customer paid in full and earned nothing with
   * no trace. Uses forTenant() (not `platform`) for the Customer/
   * LoyaltyTransaction writes specifically because those ARE tenant-scoped
   * models needing the auto-injected tenantId — `platform` is only for the
   * genuinely platform-level Tenant name lookup below, same split
   * sendPaymentReceived already uses.
   */
  private async earnLoyaltyPoints(invoice: { id: string; customerId: string; subtotal: Prisma.Decimal; customer: { id: string; name: string; mobile: string; email: string | null } }): Promise<void> {
    const tenantId = TenantContext.requireTenantId();
    const db = this.prisma.forTenant();
    const settings = await db.tenantSettings.findUniqueOrThrow({ where: { tenantId } });
    if (!settings.loyaltyEnabled) return;

    const pointsEarned = computePointsEarned(invoice.subtotal, settings.loyaltyPointsPerRupee);
    if (pointsEarned <= 0) return;

    await db.$transaction(async (tx) => {
      await adjustLoyaltyBalance(tx as unknown as Prisma.TransactionClient, invoice.customerId, pointsEarned, { invoiceId: invoice.id, type: 'EARNED' });
    });

    const tenant = await this.prisma.platform.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    const customer = await db.customer.findUnique({ where: { id: invoice.customerId } });
    const content = pointsEarnedMessage({
      workshopName: tenant?.name ?? 'AutoNexa',
      customerName: invoice.customer.name,
      points: String(pointsEarned),
      balance: String(customer?.loyaltyPointsBalance ?? pointsEarned),
    });
    await this.messaging.notifyCustomer(tenantId, 'loyalty.points-earned', { email: invoice.customer.email, mobile: invoice.customer.mobile, customerId: invoice.customer.id }, content, { type: 'Invoice', id: invoice.id });
  }

  /** Best-effort — see MessagingService.notifyCustomer's doc comment on why this never throws. */
  private async sendPaymentReceived(
    invoice: {
      id: string;
      invoiceNumber: string;
      customer: { id: string; name: string; mobile: string; email: string | null };
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
      { email: invoice.customer.email, mobile: invoice.customer.mobile, customerId: invoice.customer.id },
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
