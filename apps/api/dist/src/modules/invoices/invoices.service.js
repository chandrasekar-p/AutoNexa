"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoicesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenant_context_1 = require("../../prisma/tenant-context");
const generate_sequence_number_1 = require("../../common/sequence/generate-sequence-number");
const rollup_payment_status_1 = require("../../common/billing/rollup-payment-status");
const messaging_service_1 = require("../messaging/messaging.service");
const templates_1 = require("../messaging/templates");
const storage_types_1 = require("../storage/storage.types");
const package_coverage_1 = require("../service-packages/package-coverage");
const warranty_claim_coverage_1 = require("../warranty/warranty-claim-coverage");
const loyalty_eligibility_1 = require("../loyalty/loyalty-eligibility");
const loyalty_ledger_1 = require("../loyalty/loyalty-ledger");
const gst_split_1 = require("./gst-split");
const discount_1 = require("./discount");
const payment_guard_1 = require("./payment-guard");
const invoice_pdf_1 = require("./invoice-pdf");
const invoice_overdue_1 = require("./invoice-overdue");
const CUSTOMER_SUMMARY_SELECT = { id: true, name: true, mobile: true, email: true, state: true };
const JOB_CARD_SUMMARY_SELECT = {
    id: true,
    jobCardNumber: true,
    createdAt: true,
    vehicle: { select: { id: true, registrationNo: true, brand: true, model: true, vin: true } },
    serviceAdvisor: { select: { id: true, name: true } },
    technician: { select: { id: true, user: { select: { name: true } } } },
};
const INVOICE_INCLUDE = {
    customer: { select: CUSTOMER_SUMMARY_SELECT },
    jobCard: { select: JOB_CARD_SUMMARY_SELECT },
    lineItems: true,
    payments: { orderBy: { paymentDate: 'desc' } },
};
const LIST_INCLUDE = {
    customer: { select: CUSTOMER_SUMMARY_SELECT },
    jobCard: { select: JOB_CARD_SUMMARY_SELECT },
    payments: { select: { amount: true } },
};
const GENERATABLE_STATUSES = [client_1.JobCardStatus.READY_FOR_DELIVERY, client_1.JobCardStatus.DELIVERED];
const INVOICE_STATUSES = {
    unpaid: client_1.InvoiceStatus.UNPAID,
    partiallyPaid: client_1.InvoiceStatus.PARTIALLY_PAID,
    paid: client_1.InvoiceStatus.PAID,
};
let InvoicesService = class InvoicesService {
    constructor(prisma, messaging, storage) {
        this.prisma = prisma;
        this.messaging = messaging;
        this.storage = storage;
    }
    async generateFromJobCard(jobCardId, dto = {}) {
        const db = this.prisma.forTenant();
        const jobCard = await db.jobCard.findFirst({ where: { id: jobCardId, deletedAt: null } });
        if (!jobCard)
            throw new common_1.NotFoundException('Job card not found');
        if (!GENERATABLE_STATUSES.includes(jobCard.status)) {
            throw new common_1.BadRequestException('Job card must be READY_FOR_DELIVERY or DELIVERED to generate an invoice');
        }
        const existing = await db.invoice.findFirst({ where: { jobCardId } });
        if (existing)
            throw new common_1.ConflictException('An invoice already exists for this job card');
        const tenantId = tenant_context_1.TenantContext.requireTenantId();
        const [customer, tenantSettings, labourLines, partLines] = await Promise.all([
            db.customer.findFirstOrThrow({ where: { id: jobCard.customerId } }),
            db.tenantSettings.findUniqueOrThrow({ where: { tenantId } }),
            db.jobCardLabour.findMany({ where: { jobCardId }, include: { labourItem: { select: { description: true } } } }),
            db.jobCardPart.findMany({ where: { jobCardId }, include: { part: { select: { partNumber: true, name: true, categoryId: true } } } }),
        ]);
        const inclusions = await this.loadPackageInclusions(jobCard.redeemedPackageId);
        const isBillableByClaimId = await this.loadClaimBillability([...labourLines, ...partLines]);
        const chargeableLabourLines = labourLines.filter((l) => !(inclusions && (0, package_coverage_1.isLabourCoveredByPackage)(l.labourItemId, inclusions)) && !(0, warranty_claim_coverage_1.isLineFreeUnderWarrantyClaim)(l.warrantyClaimId, isBillableByClaimId));
        const chargeablePartLines = partLines.filter((p) => !(inclusions && (0, package_coverage_1.isPartCoveredByPackage)(p.partId, p.part.categoryId, inclusions)) &&
            !(0, warranty_claim_coverage_1.isLineFreeUnderWarrantyClaim)(p.warrantyClaimId, isBillableByClaimId));
        const lineItemInputs = [
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
                quantity: new client_1.Prisma.Decimal(p.quantity),
                unitPrice: p.unitPrice,
                gstRate: p.gstRate,
                hsnSac: p.hsnSac,
                lineTotal: p.lineTotal,
            })),
        ];
        if (lineItemInputs.length === 0) {
            throw new common_1.BadRequestException(inclusions || isBillableByClaimId.size > 0
                ? 'Everything on this job card is covered by the redeemed package or a free warranty claim — nothing left to invoice'
                : 'Job card has no labour or parts to invoice');
        }
        const loyaltyPointsRedeemed = dto.redeemLoyaltyPoints ?? 0;
        const loyaltyDiscountAmount = loyaltyPointsRedeemed > 0 ? await this.resolveLoyaltyDiscount(tenantSettings, jobCard.customerId, loyaltyPointsRedeemed, lineItemInputs) : new client_1.Prisma.Decimal(0);
        const invoice = await db.$transaction(async (tx) => {
            const created = await this.createInvoiceInTransaction(tx, {
                tenantId,
                tenantSettings,
                customerId: jobCard.customerId,
                customerState: customer.state,
                jobCardId,
                lineItemInputs,
                loyaltyPointsRedeemed,
                loyaltyDiscountAmount,
            });
            if (loyaltyPointsRedeemed > 0) {
                await (0, loyalty_ledger_1.adjustLoyaltyBalance)(tx, jobCard.customerId, -loyaltyPointsRedeemed, {
                    invoiceId: created.id,
                    type: 'REDEEMED',
                });
            }
            return created;
        });
        await this.sendInvoiceIssued(tenantId, customer, invoice.id, invoice.invoiceNumber, invoice.grandTotal);
        return this.findOne(invoice.id);
    }
    async loadPackageInclusions(redeemedPackageId) {
        if (!redeemedPackageId)
            return null;
        const pkg = await this.prisma.forTenant().customerServicePackage.findUnique({
            where: { id: redeemedPackageId },
            include: { servicePackage: { include: { includedLabourItems: true, includedParts: true, includedPartCategories: true } } },
        });
        if (!pkg)
            return null;
        return {
            labourItemIds: new Set(pkg.servicePackage.includedLabourItems.map((i) => i.labourItemId)),
            partIds: new Set(pkg.servicePackage.includedParts.map((i) => i.partId)),
            partCategoryIds: new Set(pkg.servicePackage.includedPartCategories.map((i) => i.partCategoryId)),
        };
    }
    async loadClaimBillability(lines) {
        const claimIds = [...new Set(lines.map((l) => l.warrantyClaimId).filter((id) => id !== null))];
        if (claimIds.length === 0)
            return new Map();
        const claims = await this.prisma.forTenant().warrantyClaim.findMany({ where: { id: { in: claimIds } }, select: { id: true, isBillable: true } });
        return new Map(claims.map((c) => [c.id, c.isBillable]));
    }
    async resolveLoyaltyDiscount(tenantSettings, customerId, requestedPoints, lineItemInputs) {
        if (!tenantSettings.loyaltyEnabled)
            throw new common_1.BadRequestException('Loyalty program is not enabled for this workshop');
        const customer = await this.prisma.forTenant().customer.findFirstOrThrow({ where: { id: customerId } });
        if (!(0, loyalty_eligibility_1.hasSufficientPoints)(customer.loyaltyPointsBalance, requestedPoints)) {
            throw new common_1.BadRequestException('Requested points exceed the customer\'s loyalty balance');
        }
        const discount = (0, loyalty_eligibility_1.computeRedemptionValue)(requestedPoints, tenantSettings.loyaltyPointValueRupees);
        const subtotal = lineItemInputs.reduce((sum, item) => sum.add(item.lineTotal), new client_1.Prisma.Decimal(0));
        if (discount.gt(subtotal)) {
            throw new common_1.BadRequestException('Requested points are worth more than this invoice\'s subtotal — redeem fewer points');
        }
        return discount;
    }
    async createInvoiceInTransaction(tx, params) {
        const discountedLines = params.loyaltyDiscountAmount?.gt(0) ? (0, discount_1.applyProRataDiscount)(params.lineItemInputs, params.loyaltyDiscountAmount) : params.lineItemInputs;
        const { subtotal, cgstAmount, sgstAmount, igstAmount } = (0, gst_split_1.calculateGstSplit)(discountedLines, params.tenantSettings.state, params.customerState);
        const unroundedGrandTotal = subtotal.add(cgstAmount).add(sgstAmount).add(igstAmount);
        const { roundOff, grandTotal } = (0, gst_split_1.computeRoundOff)(unroundedGrandTotal);
        const invoiceNumber = await (0, generate_sequence_number_1.generateSequenceNumber)(tx, params.tenantId, 'INVOICE', params.tenantSettings.invoicePrefix);
        const now = new Date();
        const dueDate = new Date(now.getTime() + params.tenantSettings.invoicePaymentTermDays * 24 * 60 * 60 * 1000);
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
                status: client_1.InvoiceStatus.UNPAID,
                dueDate,
            },
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
            })),
        });
        return created;
    }
    async sendInvoiceIssued(tenantId, customer, invoiceId, invoiceNumber, grandTotal) {
        const tenant = await this.prisma.platform.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
        const content = (0, templates_1.invoiceIssuedMessage)({
            workshopName: tenant?.name ?? 'AutoNexa',
            customerName: customer.name,
            invoiceNumber,
            grandTotal: `₹${Number(grandTotal).toFixed(2)}`,
        });
        await this.messaging.notifyCustomer(tenantId, 'invoice.issued', { email: customer.email, mobile: customer.mobile, customerId: customer.id }, content, { type: 'Invoice', id: invoiceId });
        await this.messaging.notifyOps(tenantId, 'invoice.issued', `Invoice ${invoiceNumber} issued: ${customer.name} — ₹${Number(grandTotal).toFixed(2)}`, { type: 'Invoice', id: invoiceId });
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const db = this.prisma.forTenant();
        const where = {
            ...(query.customerId ? { customerId: query.customerId } : {}),
            ...(query.vehicleId ? { jobCard: { vehicleId: query.vehicleId } } : {}),
            ...(query.jobCardId ? { jobCardId: query.jobCardId } : {}),
            ...(query.serviceAdvisorId ? { jobCard: { serviceAdvisorId: query.serviceAdvisorId } } : {}),
            ...(query.displayStatus ? (0, invoice_overdue_1.invoiceDisplayStatusWhere)(query.displayStatus) : query.status ? { status: query.status } : {}),
            ...(query.from || query.to
                ? {
                    createdAt: {
                        ...(query.from ? { gte: new Date(query.from) } : {}),
                        ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
                    },
                }
                : {}),
            ...(query.minAmount !== undefined || query.maxAmount !== undefined
                ? {
                    grandTotal: {
                        ...(query.minAmount !== undefined ? { gte: query.minAmount } : {}),
                        ...(query.maxAmount !== undefined ? { lte: query.maxAmount } : {}),
                    },
                }
                : {}),
            ...(query.search
                ? {
                    OR: [
                        { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
                        { jobCard: { jobCardNumber: { contains: query.search, mode: 'insensitive' } } },
                        { jobCard: { vehicle: { registrationNo: { contains: query.search, mode: 'insensitive' } } } },
                        { customer: { name: { contains: query.search, mode: 'insensitive' } } },
                    ],
                }
                : {}),
        };
        const [items, total] = await Promise.all([
            db.invoice.findMany({
                where,
                include: LIST_INCLUDE,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.invoice.count({ where }),
        ]);
        return { items: items.map((i) => this.toListRow(i)), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    toListRow(invoice) {
        const { payments, ...rest } = invoice;
        const paidAmount = payments.reduce((sum, p) => sum.add(p.amount), new client_1.Prisma.Decimal(0));
        const dueAmount = new client_1.Prisma.Decimal(invoice.grandTotal).sub(paidAmount);
        return {
            ...rest,
            paidAmount: paidAmount.toString(),
            dueAmount: dueAmount.toString(),
            displayStatus: (0, invoice_overdue_1.deriveInvoiceDisplayStatus)(invoice.status, invoice.dueDate),
            overdueDays: invoice.dueDate ? (0, invoice_overdue_1.computeOverdueDays)(invoice.dueDate) : null,
        };
    }
    async findOne(id) {
        const invoice = await this.prisma.forTenant().invoice.findFirst({
            where: { id },
            include: INVOICE_INCLUDE,
        });
        if (!invoice)
            throw new common_1.NotFoundException('Invoice not found');
        const paidAmount = invoice.payments.reduce((sum, p) => sum.add(p.amount), new client_1.Prisma.Decimal(0));
        const dueAmount = new client_1.Prisma.Decimal(invoice.grandTotal).sub(paidAmount);
        return {
            ...invoice,
            paidAmount: paidAmount.toString(),
            dueAmount: dueAmount.toString(),
            displayStatus: (0, invoice_overdue_1.deriveInvoiceDisplayStatus)(invoice.status, invoice.dueDate),
            overdueDays: invoice.dueDate ? (0, invoice_overdue_1.computeOverdueDays)(invoice.dueDate) : null,
        };
    }
    async resend(id) {
        const invoice = await this.findOne(id);
        const tenantId = tenant_context_1.TenantContext.requireTenantId();
        const { workshopName, pdfBuffer } = await this.buildInvoicePdfBuffer(invoice);
        const content = (0, templates_1.invoiceIssuedMessage)({
            workshopName,
            customerName: invoice.customer.name,
            invoiceNumber: invoice.invoiceNumber,
            grandTotal: `₹${Number(invoice.grandTotal).toFixed(2)}`,
        });
        const attempts = await this.messaging.notifyCustomer(tenantId, 'invoice.resent', { email: invoice.customer.email, mobile: invoice.customer.mobile, customerId: invoice.customer.id }, content, { type: 'Invoice', id }, [{ filename: `${invoice.invoiceNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]);
        return { id, attempts };
    }
    async downloadPdf(id) {
        const invoice = await this.findOne(id);
        const { pdfBuffer } = await this.buildInvoicePdfBuffer(invoice);
        return { fileName: `${invoice.invoiceNumber}.pdf`, buffer: pdfBuffer };
    }
    async buildInvoicePdfBuffer(invoice) {
        const tenantId = tenant_context_1.TenantContext.requireTenantId();
        const [tenant, settings] = await Promise.all([
            this.prisma.platform.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
            this.prisma.platform.tenantSettings.findUnique({ where: { tenantId } }),
        ]);
        const workshopName = tenant?.name ?? 'AutoNexa';
        const pdfBuffer = await (0, invoice_pdf_1.buildInvoicePdf)({
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
    async readLogoBuffer(logoUrl) {
        if (!logoUrl)
            return null;
        try {
            return await this.storage.getBuffer(logoUrl);
        }
        catch {
            return null;
        }
    }
    async recordPayment(invoiceId, dto) {
        return this.applyPayment(invoiceId, {
            amount: dto.amount,
            paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : undefined,
            method: dto.method,
            referenceNumber: dto.referenceNumber,
        });
    }
    async applyCapturedPayment(invoiceId, gateway) {
        return this.applyPayment(invoiceId, {
            amount: gateway.amount,
            method: 'razorpay',
            provider: 'razorpay',
            providerOrderId: gateway.providerOrderId,
            providerPaymentId: gateway.providerPaymentId,
            providerSignature: gateway.providerSignature,
        });
    }
    async applyPayment(invoiceId, data) {
        const invoice = await this.assertExists(invoiceId);
        const db = this.prisma.forTenant();
        const existingPayments = await db.payment.findMany({ where: { invoiceId } });
        const totalPaidSoFar = existingPayments.reduce((sum, p) => sum.add(p.amount), new client_1.Prisma.Decimal(0));
        if ((0, payment_guard_1.isOverpayment)(totalPaidSoFar, invoice.grandTotal, data.amount)) {
            throw new common_1.BadRequestException('Payment would exceed the invoice grand total');
        }
        await db.payment.create({
            data: { invoiceId, ...data },
        });
        const wasAlreadyPaid = invoice.status === client_1.InvoiceStatus.PAID;
        const updated = await this.recalculateStatus(invoiceId);
        await this.sendPaymentReceived(updated, Number(data.amount));
        if (!wasAlreadyPaid && updated.status === client_1.InvoiceStatus.PAID) {
            await this.earnLoyaltyPoints(updated);
        }
        return this.findOne(invoiceId);
    }
    async earnLoyaltyPoints(invoice) {
        const tenantId = tenant_context_1.TenantContext.requireTenantId();
        const db = this.prisma.forTenant();
        const settings = await db.tenantSettings.findUniqueOrThrow({ where: { tenantId } });
        if (!settings.loyaltyEnabled)
            return;
        const pointsEarned = (0, loyalty_eligibility_1.computePointsEarned)(invoice.subtotal, settings.loyaltyPointsPerRupee);
        if (pointsEarned <= 0)
            return;
        await db.$transaction(async (tx) => {
            await (0, loyalty_ledger_1.adjustLoyaltyBalance)(tx, invoice.customerId, pointsEarned, { invoiceId: invoice.id, type: 'EARNED' });
        });
        const tenant = await this.prisma.platform.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
        const customer = await db.customer.findUnique({ where: { id: invoice.customerId } });
        const content = (0, templates_1.pointsEarnedMessage)({
            workshopName: tenant?.name ?? 'AutoNexa',
            customerName: invoice.customer.name,
            points: String(pointsEarned),
            balance: String(customer?.loyaltyPointsBalance ?? pointsEarned),
        });
        await this.messaging.notifyCustomer(tenantId, 'loyalty.points-earned', { email: invoice.customer.email, mobile: invoice.customer.mobile, customerId: invoice.customer.id }, content, { type: 'Invoice', id: invoice.id });
    }
    async sendPaymentReceived(invoice, amount) {
        const tenantId = tenant_context_1.TenantContext.requireTenantId();
        const tenant = await this.prisma.platform.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
        const content = (0, templates_1.paymentReceivedMessage)({
            workshopName: tenant?.name ?? 'AutoNexa',
            customerName: invoice.customer.name,
            invoiceNumber: invoice.invoiceNumber,
            amount: `₹${Number(amount).toFixed(2)}`,
        });
        await this.messaging.notifyCustomer(tenantId, 'payment.received', { email: invoice.customer.email, mobile: invoice.customer.mobile, customerId: invoice.customer.id }, content, { type: 'Invoice', id: invoice.id });
        await this.messaging.notifyOps(tenantId, 'payment.received', `Payment received: ${invoice.customer.name} — ₹${Number(amount).toFixed(2)} against ${invoice.invoiceNumber}`, { type: 'Invoice', id: invoice.id });
    }
    async recalculateStatus(id) {
        const db = this.prisma.forTenant();
        const [invoice, payments] = await Promise.all([
            db.invoice.findFirstOrThrow({ where: { id } }),
            db.payment.findMany({ where: { invoiceId: id } }),
        ]);
        const totalPaid = payments.reduce((sum, p) => sum.add(p.amount), new client_1.Prisma.Decimal(0));
        const status = (0, rollup_payment_status_1.rollupPaymentStatus)(totalPaid, invoice.grandTotal, INVOICE_STATUSES);
        return db.invoice.update({
            where: { id },
            data: { status },
            include: INVOICE_INCLUDE,
        });
    }
    async summary() {
        const db = this.prisma.forTenant();
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const [totalThisMonth, paidAgg, unpaidRows, overdueRows, revenueAgg, recentPayments, monthlyPayments] = await Promise.all([
            db.invoice.count({ where: { createdAt: { gte: monthStart, lt: monthEnd } } }),
            db.invoice.aggregate({ where: (0, invoice_overdue_1.invoiceDisplayStatusWhere)('PAID', now), _count: true, _sum: { grandTotal: true } }),
            db.invoice.findMany({
                where: (0, invoice_overdue_1.invoiceDisplayStatusWhere)('UNPAID', now),
                select: { grandTotal: true, payments: { select: { amount: true } } },
            }),
            db.invoice.findMany({
                where: (0, invoice_overdue_1.invoiceDisplayStatusWhere)('OVERDUE', now),
                select: {
                    id: true,
                    invoiceNumber: true,
                    grandTotal: true,
                    dueDate: true,
                    customer: { select: { id: true, name: true } },
                    payments: { select: { amount: true } },
                },
            }),
            db.payment.aggregate({ where: { paymentDate: { gte: monthStart, lt: monthEnd } }, _sum: { amount: true } }),
            db.payment.findMany({
                orderBy: { paymentDate: 'desc' },
                take: 5,
                select: { id: true, amount: true, paymentDate: true, invoice: { select: { id: true, invoiceNumber: true, customer: { select: { name: true } } } } },
            }),
            db.payment.findMany({
                where: { paymentDate: { gte: monthStart, lt: monthEnd } },
                select: { amount: true, invoice: { select: { customerId: true, customer: { select: { name: true } } } } },
            }),
        ]);
        const outstandingOf = (row) => {
            const paid = row.payments.reduce((sum, p) => sum.add(p.amount), new client_1.Prisma.Decimal(0));
            return new client_1.Prisma.Decimal(row.grandTotal).sub(paid);
        };
        const sumOutstanding = (rows) => rows.reduce((sum, r) => sum.add(outstandingOf(r)), new client_1.Prisma.Decimal(0));
        const aging = { d0to30: new client_1.Prisma.Decimal(0), d31to60: new client_1.Prisma.Decimal(0), d60plus: new client_1.Prisma.Decimal(0) };
        for (const row of overdueRows) {
            const days = row.dueDate ? (0, invoice_overdue_1.computeOverdueDays)(row.dueDate, now) : 0;
            const bucket = days <= 30 ? 'd0to30' : days <= 60 ? 'd31to60' : 'd60plus';
            aging[bucket] = aging[bucket].add(outstandingOf(row));
        }
        const overdueList = overdueRows
            .map((row) => ({
            id: row.id,
            invoiceNumber: row.invoiceNumber,
            customerName: row.customer.name,
            dueAmount: outstandingOf(row).toString(),
            overdueDays: row.dueDate ? (0, invoice_overdue_1.computeOverdueDays)(row.dueDate, now) : 0,
        }))
            .sort((a, b) => b.overdueDays - a.overdueDays)
            .slice(0, 5);
        const recentlyPaid = recentPayments.map((p) => ({
            id: p.id,
            invoiceId: p.invoice.id,
            invoiceNumber: p.invoice.invoiceNumber,
            customerName: p.invoice.customer.name,
            amount: p.amount.toString(),
            paymentDate: p.paymentDate,
        }));
        const topCustomersMap = new Map();
        for (const p of monthlyPayments) {
            const existing = topCustomersMap.get(p.invoice.customerId);
            if (existing)
                existing.total = existing.total.add(p.amount);
            else
                topCustomersMap.set(p.invoice.customerId, { name: p.invoice.customer.name, total: new client_1.Prisma.Decimal(p.amount) });
        }
        const topPayingCustomers = Array.from(topCustomersMap.values())
            .sort((a, b) => b.total.cmp(a.total))
            .slice(0, 5)
            .map((c) => ({ name: c.name, amount: c.total.toString() }));
        return {
            totalInvoicesThisMonth: totalThisMonth,
            paid: { count: paidAgg._count, amount: (paidAgg._sum.grandTotal ?? new client_1.Prisma.Decimal(0)).toString() },
            unpaid: { count: unpaidRows.length, amount: sumOutstanding(unpaidRows).toString() },
            overdue: { count: overdueRows.length, amount: sumOutstanding(overdueRows).toString() },
            totalRevenueThisMonth: (revenueAgg._sum.amount ?? new client_1.Prisma.Decimal(0)).toString(),
            aging: { d0to30: aging.d0to30.toString(), d31to60: aging.d31to60.toString(), d60plus: aging.d60plus.toString() },
            recentlyPaid,
            overdueList,
            topPayingCustomers,
        };
    }
    async assertExists(id) {
        const invoice = await this.prisma.forTenant().invoice.findFirst({ where: { id } });
        if (!invoice)
            throw new common_1.NotFoundException('Invoice not found');
        return invoice;
    }
};
exports.InvoicesService = InvoicesService;
exports.InvoicesService = InvoicesService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(storage_types_1.STORAGE_SERVICE)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        messaging_service_1.MessagingService, Object])
], InvoicesService);
//# sourceMappingURL=invoices.service.js.map