import { Injectable } from '@nestjs/common';
import { SendResult } from './provider.types';

/**
 * Unlike the other three providers, Slack has no global config — each
 * tenant supplies its own incoming webhook URL (TenantSettings.slackWebhookUrl),
 * so the URL is passed per-call rather than read from ConfigService.
 */
@Injectable()
export class SlackProvider {
  async send(webhookUrl: string, text: string): Promise<SendResult> {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const errorBody = await res.text();
        return { ok: false, error: `Slack webhook ${res.status}: ${errorBody}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown Slack error' };
    }
  }
}
