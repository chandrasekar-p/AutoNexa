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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoicesService = void 0;
const common_1 = require("@nestjs/common");
const promises_1 = require("fs/promises");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenant_context_1 = require("../../prisma/tenant-context");
const generate_sequence_number_1 = require("../../common/sequence/generate-sequence-number");
const rollup_payment_status_1 = require("../../common/billing/rollup-payment-status");
const messaging_service_1 = require("../messaging/messaging.service");
const templates_1 = require("../messaging/templates");
const upload_storage_1 = require("../uploads/upload-storage");
const gst_split_1 = require("./gst-split");
const payment_guard_1 = require("./payment-guard");
const invoice_pdf_1 = require("./invoice-pdf");
const CUSTOMER_SUMMARY_SELECT = { id: true, name: true, mobile: true, email: true, state: true };
const INVOICE_INCLUDE = {
    customer: { select: CUSTOMER_SUMMARY_SELECT },
    jobCard: { select: { id: true, jobCardNumber: true } },
    lineItems: true,
    payments: { orderBy: { paymentDate: 'desc' } },
};
const GENERATABLE_STATUSES = [client_1.JobCardStatus.READY_FOR_DELIVERY, client_1.JobCardStatus.DELIVERED];
const INVOICE_STATUSES = {
    unpaid: client_1.InvoiceStatus.UNPAID,
    partiallyPaid: client_1.InvoiceStatus.PARTIALLY_PAID,
    paid: client_1.InvoiceStatus.PAID,
};
let InvoicesService = class InvoicesService {
    constructor(prisma, messaging) {
        this.prisma = prisma;
        this.messaging = messaging;
    }
    async generateFromJobCard(jobCardId) {
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
            db.jobCardPart.findMany({ where: { jobCardId }, include: { part: { select: { partNumber: true, name: true } } } }),
        ]);
        const lineItemInputs = [
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
                quantity: new client_1.Prisma.Decimal(p.quantity),
                unitPrice: p.unitPrice,
                gstRate: p.gstRate,
                hsnSac: p.hsnSac,
                lineTotal: p.lineTotal,
            })),
        ];
        if (lineItemInputs.length === 0) {
            throw new common_1.BadRequestException('Job card has no labour or parts to invoice');
        }
        const { subtotal, cgstAmount, sgstAmount, igstAmount } = (0, gst_split_1.calculateGstSplit)(lineItemInputs, tenantSettings.state, customer.state);
        const unroundedGrandTotal = subtotal.add(cgstAmount).add(sgstAmount).add(igstAmount);
        const { roundOff, grandTotal } = (0, gst_split_1.computeRoundOff)(unroundedGrandTotal);
        const invoice = await db.$transaction(async (tx) => {
            const invoiceNumber = await (0, generate_sequence_number_1.generateSequenceNumber)(tx, tenantId, 'INVOICE', tenantSettings.invoicePrefix);
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
                    status: client_1.InvoiceStatus.UNPAID,
                },
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
                })),
            });
            return created;
        });
        await this.sendInvoiceIssued(tenantId, customer, invoice.id, invoice.invoiceNumber, grandTotal);
        return this.findOne(invoice.id);
    }
    async sendInvoiceIssued(tenantId, customer, invoiceId, invoiceNumber, grandTotal) {
        const tenant = await this.prisma.platform.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
        const content = (0, templates_1.invoiceIssuedMessage)({
            workshopName: tenant?.name ?? 'AutoNexa',
            customerName: customer.name,
            invoiceNumber,
            grandTotal: `₹${Number(grandTotal).toFixed(2)}`,
        });
        await this.messaging.notifyCustomer(tenantId, 'invoice.issued', { email: customer.email, mobile: customer.mobile }, content, { type: 'Invoice', id: invoiceId });
        await this.messaging.notifyOps(tenantId, 'invoice.issued', `Invoice ${invoiceNumber} issued: ${customer.name} — ₹${Number(grandTotal).toFixed(2)}`, { type: 'Invoice', id: invoiceId });
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const db = this.prisma.forTenant();
        const where = {
            ...(query.customerId ? { customerId: query.customerId } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.search ? { invoiceNumber: { contains: query.search, mode: 'insensitive' } } : {}),
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
    async findOne(id) {
        const invoice = await this.prisma.forTenant().invoice.findFirst({
            where: { id },
            include: INVOICE_INCLUDE,
        });
        if (!invoice)
            throw new common_1.NotFoundException('Invoice not found');
        return invoice;
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
        const attempts = await this.messaging.notifyCustomer(tenantId, 'invoice.resent', { email: invoice.customer.email, mobile: invoice.customer.mobile }, content, { type: 'Invoice', id }, [{ filename: `${invoice.invoiceNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]);
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
            return await (0, promises_1.readFile)((0, upload_storage_1.resolveUploadPath)(logoUrl));
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
        const updated = await this.recalculateStatus(invoiceId);
        await this.sendPaymentReceived(updated, Number(data.amount));
        return updated;
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
        await this.messaging.notifyCustomer(tenantId, 'payment.received', { email: invoice.customer.email, mobile: invoice.customer.mobile }, content, { type: 'Invoice', id: invoice.id });
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        messaging_service_1.MessagingService])
], InvoicesService);
//# sourceMappingURL=invoices.service.js.map