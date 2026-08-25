import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toE164 } from '../../../common/validators/mobile';
import { SendResult } from './provider.types';

/**
 * Meta WhatsApp Cloud API — sends a free-text message via the Graph API.
 * Note: outside Meta's 24-hour customer-service window, free-text sends are
 * rejected and only pre-approved template messages are allowed; template
 * registration/management is out of scope for this pass (see the phase
 * write-up) — this covers the common in-window case, and a rejected send
 * is logged as FAILED with Meta's error message rather than silently lost.
 */
@Injectable()
export class WhatsAppProvider {
  private readonly accessToken: string | undefined;
  private readonly phoneNumberId: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.accessToken = this.config.get<string>('messaging.whatsapp.accessToken');
    this.phoneNumberId = this.config.get<string>('messaging.whatsapp.phoneNumberId');
  }

  isConfigured(): boolean {
    return Boolean(this.accessToken && this.phoneNumberId);
  }

  async send(to: string, body: string): Promise<SendResult> {
    if (!this.accessToken || !this.phoneNumberId) return { ok: false, error: 'WhatsApp Cloud API not configured' };
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: toE164(to),
          type: 'text',
          text: { body },
        }),
      });
      if (!res.ok) {
        const errorBody = await res.text();
        return { ok: false, error: `WhatsApp API ${res.status}: ${errorBody}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown WhatsApp error' };
    }
  }
}
