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
var PaymentsGatewayService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsGatewayService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenant_context_1 = require("../../prisma/tenant-context");
const outstanding_1 = require("../../common/billing/outstanding");
const verify_razorpay_signature_1 = require("../../common/gateway/verify-razorpay-signature");
const messaging_service_1 = require("../messaging/messaging.service");
const templates_1 = require("../messaging/templates");
const invoices_service_1 = require("../invoices/invoices.service");
const razorpay_provider_1 = require("./providers/razorpay.provider");
const WEBHOOK_SENTINEL_USER_ID = 'system:razorpay-webhook';
let PaymentsGatewayService = PaymentsGatewayService_1 = class PaymentsGatewayService {
    constructor(prisma, config, messaging, invoicesService, razorpay) {
        this.prisma = prisma;
        this.config = config;
        this.messaging = messaging;
        this.invoicesService = invoicesService;
        this.razorpay = razorpay;
        this.logger = new common_1.Logger(PaymentsGatewayService_1.name);
    }
    async createPaymentLink(invoiceId) {
        if (!this.razorpay.isConfigured()) {
            throw new common_1.BadRequestException('Payment gateway is not configured for this workshop');
        }
        const invoice = await this.invoicesService.findOne(invoiceId);
        const outstanding = (0, outstanding_1.computeInvoiceOutstanding)(invoice);
        if (outstanding.lte(0)) {
            throw new common_1.BadRequestException('This invoice has no outstanding balance');
        }
        const tenantId = tenant_context_1.TenantContext.requireTenantId();
        const frontendUrl = this.config.get('razorpay.frontendUrl');
        const link = await this.razorpay.createPaymentLink({
            amount: outstanding.toNumber(),
            referenceId: invoice.invoiceNumber,
            description: `Invoice ${invoice.invoiceNumber}`,
            customerName: invoice.customer.name,
            customerEmail: invoice.customer.email,
            customerMobile: invoice.customer.mobile,
            callbackUrl: frontendUrl ? `${frontendUrl}/invoices/${invoice.id}` : undefined,
            notes: { tenantId, invoiceId: invoice.id },
        });
        await this.prisma.forTenant().invoice.update({
            where: { id: invoice.id },
            data: { pendingGatewayOrderId: link.providerOrderId },
        });
        const tenant = await this.prisma.platform.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
        const content = (0, templates_1.paymentLinkMessage)({
            workshopName: tenant?.name ?? 'AutoNexa',
            customerName: invoice.customer.name,
            invoiceNumber: invoice.invoiceNumber,
            amount: `₹${outstanding.toFixed(2)}`,
            paymentUrl: link.shortUrl,
        });
        const attempts = await this.messaging.notifyCustomer(tenantId, 'invoice.payment-link', { email: invoice.customer.email, mobile: invoice.customer.mobile }, content, { type: 'Invoice', id: invoice.id });
        return { id: invoice.id, shortUrl: link.shortUrl, expiresAt: link.expiresAt, attempts };
    }
    async handleWebhook(rawBody, signatureHeader, eventIdHeader) {
        const webhookSecret = this.razorpay.getWebhookSecret();
        const signatureValid = !!webhookSecret && (0, verify_razorpay_signature_1.verifyRazorpaySignature)(rawBody, signatureHeader, webhookSecret);
        let payload;
        try {
            payload = JSON.parse(rawBody.toString('utf8'));
        }
        catch {
            this.logger.warn('Received an unparseable Razorpay webhook body');
            return;
        }
        const eventType = String(payload.event ?? 'unknown');
        const eventId = eventIdHeader ?? `${eventType}:${JSON.stringify(payload).slice(0, 200)}`;
        const providerOrderId = extractPaymentLinkId(payload);
        if (!signatureValid) {
            await this.recordEvent({ tenantId: null, eventId, eventType, providerOrderId, signatureValid: false, rawPayload: payload, processingError: 'Invalid or missing signature' });
            this.logger.warn(`Rejected Razorpay webhook with invalid signature (event: ${eventType})`);
            return;
        }
        const inserted = await this.tryInsertEvent({ eventId, eventType, providerOrderId, signatureValid: true, rawPayload: payload });
        if (!inserted) {
            this.logger.log(`Ignoring duplicate Razorpay webhook delivery (event: ${eventId})`);
            return;
        }
        try {
            if (!providerOrderId) {
                await this.markProcessed(inserted.id, null, 'No payment link id found in the webhook payload');
                return;
            }
            const invoice = await this.prisma.platform.invoice.findFirst({
                where: { pendingGatewayOrderId: providerOrderId },
                select: { id: true, tenantId: true },
            });
            if (!invoice) {
                await this.markProcessed(inserted.id, null, `No invoice found pending payment link ${providerOrderId}`);
                return;
            }
            await tenant_context_1.TenantContext.run({ tenantId: invoice.tenantId, userId: WEBHOOK_SENTINEL_USER_ID, isSuperAdmin: false }, async () => {
                await this.applyEvent(eventType, invoice.id, payload, signatureHeader ?? '');
            });
            await this.markProcessed(inserted.id, invoice.tenantId, undefined);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error processing webhook';
            this.logger.error(`Failed to process Razorpay webhook (event: ${eventType}): ${message}`);
            await this.markProcessed(inserted.id, null, message);
        }
    }
    async applyEvent(eventType, invoiceId, payload, signature) {
        switch (eventType) {
            case 'payment_link.paid': {
                const payment = extractPaymentEntity(payload);
                if (!payment)
                    throw new Error('payment_link.paid event missing payment entity');
                await this.invoicesService.applyCapturedPayment(invoiceId, {
                    amount: payment.amount / 100,
                    providerOrderId: extractPaymentLinkId(payload) ?? '',
                    providerPaymentId: payment.id,
                    providerSignature: signature,
                });
                await this.clearPendingOrder(invoiceId);
                return;
            }
            case 'payment_link.expired':
            case 'payment_link.cancelled':
                await this.clearPendingOrder(invoiceId);
                return;
            case 'payment.failed':
                return;
            default:
                return;
        }
    }
    async clearPendingOrder(invoiceId) {
        await this.prisma.forTenant().invoice.update({ where: { id: invoiceId }, data: { pendingGatewayOrderId: null } });
    }
    async tryInsertEvent(data) {
        try {
            return await this.prisma.platform.paymentGatewayEvent.create({
                data: {
                    eventId: data.eventId,
                    eventType: data.eventType,
                    providerOrderId: data.providerOrderId,
                    signatureValid: data.signatureValid,
                    rawPayload: data.rawPayload,
                },
                select: { id: true },
            });
        }
        catch (err) {
            if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002')
                return null;
            throw err;
        }
    }
    async recordEvent(data) {
        try {
            await this.prisma.platform.paymentGatewayEvent.create({
                data: { ...data, rawPayload: data.rawPayload, processedAt: new Date() },
            });
        }
        catch (err) {
            if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002')
                return;
            throw err;
        }
    }
    async markProcessed(eventRowId, tenantId, processingError) {
        await this.prisma.platform.paymentGatewayEvent.update({
            where: { id: eventRowId },
            data: { tenantId: tenantId ?? undefined, processedAt: new Date(), processingError: processingError ?? null },
        });
    }
};
exports.PaymentsGatewayService = PaymentsGatewayService;
exports.PaymentsGatewayService = PaymentsGatewayService = PaymentsGatewayService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        messaging_service_1.MessagingService,
        invoices_service_1.InvoicesService,
        razorpay_provider_1.RazorpayProvider])
], PaymentsGatewayService);
function extractPaymentLinkId(payload) {
    const paymentLink = payload.payload?.payment_link;
    return paymentLink?.entity?.id ?? null;
}
function extractPaymentEntity(payload) {
    const payment = payload.payload?.payment;
    const entity = payment?.entity;
    if (!entity?.id || typeof entity.amount !== 'number')
        return null;
    return { id: entity.id, amount: entity.amount };
}
//# sourceMappingURL=payments-gateway.service.js.map