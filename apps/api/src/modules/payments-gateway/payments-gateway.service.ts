import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../prisma/tenant-context';
import { computeInvoiceOutstanding } from '../../common/billing/outstanding';
import { verifyRazorpaySignature } from '../../common/gateway/verify-razorpay-signature';
import { MessagingService } from '../messaging/messaging.service';
import { paymentLinkMessage } from '../messaging/templates';
import { InvoicesService } from '../invoices/invoices.service';
import { RazorpayProvider } from './providers/razorpay.provider';

// Structurally, not persisted — the caller's own userId has no meaning for
// a webhook-driven write, but TenantContextData requires the field to
// exist. Nothing downstream in this specific path reads it (the normal
// @Audit() interceptor no-ops without request.user regardless — see
// audit-log.interceptor.ts — and PaymentGatewayEvent has no userId column
// at all; that table is this feature's audit trail instead).
const WEBHOOK_SENTINEL_USER_ID = 'system:razorpay-webhook';

// Events this handler understands. Anything else is logged to
// PaymentGatewayEvent and otherwise ignored — Razorpay's webhook catalogue
// is broader than what a Payment-Link-only integration needs to act on.
type HandledEventType = 'payment_link.paid' | 'payment_link.expired' | 'payment_link.cancelled' | 'payment.failed';

@Injectable()
export class PaymentsGatewayService {
  private readonly logger = new Logger(PaymentsGatewayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly messaging: MessagingService,
    private readonly invoicesService: InvoicesService,
    private readonly razorpay: RazorpayProvider,
  ) {}

  /**
   * Generates a Razorpay Payment Link for an invoice's current outstanding
   * balance and sends it to the customer — same single-click shape as
   * InvoicesService.resend()'s "Send Invoice" action, not a separate
   * generate-then-send pair of endpoints. Runs inside a normal authenticated
   * request, so prisma.forTenant() works exactly as it does everywhere else
   * in this codebase — the "no tenant context" problem only exists on the
   * webhook side (see handleWebhook below).
   */
  async createPaymentLink(invoiceId: string) {
    if (!this.razorpay.isConfigured()) {
      throw new BadRequestException('Payment gateway is not configured for this workshop');
    }

    const invoice = await this.invoicesService.findOne(invoiceId);
    const outstanding = computeInvoiceOutstanding(invoice);
    if (outstanding.lte(0)) {
      throw new BadRequestException('This invoice has no outstanding balance');
    }

    const tenantId = TenantContext.requireTenantId();
    const frontendUrl = this.config.get<string>('frontendUrl');

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
    const content = paymentLinkMessage({
      workshopName: tenant?.name ?? 'AutoNexa',
      customerName: invoice.customer.name,
      invoiceNumber: invoice.invoiceNumber,
      amount: `₹${outstanding.toFixed(2)}`,
      paymentUrl: link.shortUrl,
    });
    const attempts = await this.messaging.notifyCustomer(
      tenantId,
      'invoice.payment-link',
      { email: invoice.customer.email, mobile: invoice.customer.mobile },
      content,
      { type: 'Invoice', id: invoice.id },
    );

    return { id: invoice.id, shortUrl: link.shortUrl, expiresAt: link.expiresAt, attempts };
  }

  /**
   * The webhook entry point — no JWT, no request-scoped TenantContext (see
   * PaymentsGatewayController: this route is @Public()). Everything before
   * tenant resolution below runs against the unscoped `prisma.platform`
   * client, same "no request context" precedent ReminderCronService and
   * MessagingService.log() already use. Always resolves (never throws) —
   * the controller returns 200 regardless of outcome; a real processing
   * failure is recorded as `processingError` on the PaymentGatewayEvent
   * row for manual review, not surfaced as a failed HTTP response Razorpay
   * would just retry forever (see the architecture doc §3.5).
   */
  async handleWebhook(rawBody: Buffer, signatureHeader: string | undefined, eventIdHeader: string | undefined): Promise<void> {
    const webhookSecret = this.razorpay.getWebhookSecret();
    const signatureValid = !!webhookSecret && verifyRazorpaySignature(rawBody, signatureHeader, webhookSecret);

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      // Unparseable body — nothing to key an idempotency record on
      // reliably; log what we can and stop. Not expected from Razorpay
      // itself, only from a malformed/adversarial request.
      this.logger.warn('Received an unparseable Razorpay webhook body');
      return;
    }

    const eventType = String(payload.event ?? 'unknown');
    // Razorpay's own idempotency key, delivered as a header — falling back
    // to a payload-derived value only guards against the (unexpected)
    // case where the header is missing, not a substitute for it.
    const eventId = eventIdHeader ?? `${eventType}:${JSON.stringify(payload).slice(0, 200)}`;
    const providerOrderId = extractPaymentLinkId(payload);

    if (!signatureValid) {
      await this.recordEvent({ tenantId: null, eventId, eventType, providerOrderId, signatureValid: false, rawPayload: payload, processingError: 'Invalid or missing signature' });
      this.logger.warn(`Rejected Razorpay webhook with invalid signature (event: ${eventType})`);
      return;
    }

    // Idempotency: insert-or-detect-duplicate before doing anything else.
    // A unique-constraint violation on (provider, eventId) means this
    // exact event was already processed (or is being processed
    // concurrently) — Razorpay's own documented retry behavior, not a bug.
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

      // The ONLY unscoped lookup in this whole flow — safe because
      // providerOrderId (a Razorpay Payment Link id) is unique per
      // Razorpay merchant account, and this system uses one shared account
      // across every tenant, so a collision across two tenants' invoices
      // is structurally impossible; Razorpay itself guarantees the
      // uniqueness this lookup depends on. See architecture doc §3.6.
      const invoice = await this.prisma.platform.invoice.findFirst({
        where: { pendingGatewayOrderId: providerOrderId },
        select: { id: true, tenantId: true },
      });
      if (!invoice) {
        await this.markProcessed(inserted.id, null, `No invoice found pending payment link ${providerOrderId}`);
        return;
      }

      await TenantContext.run({ tenantId: invoice.tenantId, userId: WEBHOOK_SENTINEL_USER_ID, isSuperAdmin: false }, async () => {
        await this.applyEvent(eventType as HandledEventType, invoice.id, payload, signatureHeader ?? '');
      });

      await this.markProcessed(inserted.id, invoice.tenantId, undefined);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error processing webhook';
      this.logger.error(`Failed to process Razorpay webhook (event: ${eventType}): ${message}`);
      await this.markProcessed(inserted.id, null, message);
    }
  }

  /** Runs inside the TenantContext.run() block established by handleWebhook — forTenant() and InvoicesService's own TenantContext.requireTenantId() calls both work normally from here on. */
  private async applyEvent(
    eventType: HandledEventType | string,
    invoiceId: string,
    payload: Record<string, unknown>,
    signature: string,
  ): Promise<void> {
    switch (eventType) {
      case 'payment_link.paid': {
        const payment = extractPaymentEntity(payload);
        if (!payment) throw new Error('payment_link.paid event missing payment entity');
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
        // No Payment row was ever created for this order (see §2.2) — the
        // invoice was never anything but its pre-existing status. Just
        // stop pointing at a link that can no longer be paid.
        await this.clearPendingOrder(invoiceId);
        return;
      case 'payment.failed':
        // Deliberately retains pendingGatewayOrderId — Razorpay allows
        // retrying the same Payment Link after a failed attempt, unlike
        // expiry/cancellation.
        return;
      default:
        // Logged via the PaymentGatewayEvent row already written by the
        // caller; nothing else to do for an event this integration
        // doesn't act on.
        return;
    }
  }

  private async clearPendingOrder(invoiceId: string): Promise<void> {
    await this.prisma.forTenant().invoice.update({ where: { id: invoiceId }, data: { pendingGatewayOrderId: null } });
  }

  private async tryInsertEvent(data: {
    eventId: string;
    eventType: string;
    providerOrderId: string | null;
    signatureValid: boolean;
    rawPayload: Record<string, unknown>;
  }): Promise<{ id: string } | null> {
    try {
      return await this.prisma.platform.paymentGatewayEvent.create({
        data: {
          eventId: data.eventId,
          eventType: data.eventType,
          providerOrderId: data.providerOrderId,
          signatureValid: data.signatureValid,
          rawPayload: data.rawPayload as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
    } catch (err) {
      // P2002 = unique constraint violation on (provider, eventId) — a
      // genuine duplicate delivery, not an error condition.
      if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') return null;
      throw err;
    }
  }

  private async recordEvent(data: {
    tenantId: string | null;
    eventId: string;
    eventType: string;
    providerOrderId: string | null;
    signatureValid: boolean;
    rawPayload: Record<string, unknown>;
    processingError: string;
  }): Promise<void> {
    try {
      await this.prisma.platform.paymentGatewayEvent.create({
        data: { ...data, rawPayload: data.rawPayload as Prisma.InputJsonValue, processedAt: new Date() },
      });
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') return; // duplicate delivery of an already-invalid signature — fine to ignore
      throw err;
    }
  }

  private async markProcessed(eventRowId: string, tenantId: string | null, processingError: string | undefined): Promise<void> {
    await this.prisma.platform.paymentGatewayEvent.update({
      where: { id: eventRowId },
      data: { tenantId: tenantId ?? undefined, processedAt: new Date(), processingError: processingError ?? null },
    });
  }
}

/**
 * Razorpay's webhook payload shape (per their published docs): for a
 * `payment_link.*` event, `payload.payment_link.entity.id` is the Payment
 * Link id this system stores as `pendingGatewayOrderId`. Loosely typed —
 * this is third-party wire format, not a shape this codebase controls —
 * worth confirming against real payloads in Razorpay's dashboard/sandbox
 * before going live, not something reproducible from here.
 */
function extractPaymentLinkId(payload: Record<string, unknown>): string | null {
  const paymentLink = (payload.payload as Record<string, unknown> | undefined)?.payment_link as
    | { entity?: { id?: string } }
    | undefined;
  return paymentLink?.entity?.id ?? null;
}

function extractPaymentEntity(payload: Record<string, unknown>): { id: string; amount: number } | null {
  const payment = (payload.payload as Record<string, unknown> | undefined)?.payment as
    | { entity?: { id?: string; amount?: number } }
    | undefined;
  const entity = payment?.entity;
  if (!entity?.id || typeof entity.amount !== 'number') return null;
  return { id: entity.id, amount: entity.amount };
}
