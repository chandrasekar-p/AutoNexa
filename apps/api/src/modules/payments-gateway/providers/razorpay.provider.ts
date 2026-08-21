import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';

export interface CreatePaymentLinkParams {
  amount: number; // rupees — converted to paise internally, matching Razorpay's own unit
  referenceId: string; // invoice number, shown back to the customer on Razorpay's page
  description: string;
  customerName: string;
  customerEmail?: string | null;
  customerMobile: string;
  callbackUrl?: string; // omitted entirely when FRONTEND_URL isn't configured — Razorpay just shows its own default "paid" confirmation page instead of redirecting back
  notes: Record<string, string>; // echoed back on every webhook payload — a second confirmation channel alongside providerOrderId
}

export interface CreatePaymentLinkResult {
  providerOrderId: string; // Razorpay Payment Link id ("plink_...") — despite the name, this is what pendingGatewayOrderId stores; Payment Links don't expose a separate Order id up front
  shortUrl: string;
  expiresAt: Date | null;
}

/** Same isConfigured()/constructor shape as EmailProvider/SmsProvider/WhatsAppProvider — unconfigured means the feature is quietly unavailable, not a boot-time crash. */
@Injectable()
export class RazorpayProvider {
  private readonly client: Razorpay | null;

  constructor(private readonly config: ConfigService) {
    const keyId = this.config.get<string>('razorpay.keyId');
    const keySecret = this.config.get<string>('razorpay.keySecret');
    this.client = keyId && keySecret ? new Razorpay({ key_id: keyId, key_secret: keySecret }) : null;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  getWebhookSecret(): string | undefined {
    return this.config.get<string>('razorpay.webhookSecret');
  }

  async createPaymentLink(params: CreatePaymentLinkParams): Promise<CreatePaymentLinkResult> {
    if (!this.client) throw new Error('Razorpay is not configured');

    const link = await this.client.paymentLink.create({
      amount: Math.round(params.amount * 100),
      currency: 'INR',
      accept_partial: false,
      description: params.description,
      reference_id: params.referenceId,
      customer: {
        name: params.customerName,
        email: params.customerEmail ?? undefined,
        contact: params.customerMobile,
      },
      notify: { sms: false, email: false }, // AutoNexa sends the link itself via MessagingService, not Razorpay's own notification
      ...(params.callbackUrl ? { callback_url: params.callbackUrl, callback_method: 'get' as const } : {}),
      notes: params.notes,
    });

    return {
      providerOrderId: link.id,
      shortUrl: link.short_url,
      expiresAt: link.expire_by ? new Date(link.expire_by * 1000) : null,
    };
  }
}
