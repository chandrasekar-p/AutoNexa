import { Injectable } from '@nestjs/common';
import { DeliveryChannel, DeliveryStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';
import { WhatsAppProvider } from './providers/whatsapp.provider';
import { SlackProvider } from './providers/slack.provider';
import { EmailAttachment } from './providers/provider.types';
import { pickCustomerChannels, ChannelRecipient } from './pick-channels';
import { MessageContent } from './templates';

export interface RelatedEntity {
  type: string;
  id: string;
}

export interface DeliveryAttempt {
  channel: DeliveryChannel;
  status: DeliveryStatus;
}

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailProvider: EmailProvider,
    private readonly smsProvider: SmsProvider,
    private readonly whatsappProvider: WhatsAppProvider,
    private readonly slackProvider: SlackProvider,
  ) {}

  /**
   * Dispatches a customer-facing message across whichever channels are both
   * configured and reachable for this recipient (see pick-channels.ts), and
   * writes one DeliveryLog row per attempt. Never throws — a messaging
   * failure must never break the business operation (appointment booked,
   * invoice generated, ...) that triggered it; every failure is caught and
   * logged instead.
   */
  async notifyCustomer(
    tenantId: string,
    event: string,
    recipient: ChannelRecipient,
    content: MessageContent,
    related: RelatedEntity,
    // Email-only (see EmailAttachment's doc comment) — e.g. a PDF invoice
    // on a manual resend. SMS/WhatsApp always get content.body as plain text.
    attachments?: EmailAttachment[],
    // Recurring/threshold-based reminders only (see reminder-cron.service.ts
    // and DeliveryLog.dedupeKey's doc comment) — omitted by every other
    // (one-shot) trigger.
    dedupeKey?: string,
  ): Promise<DeliveryAttempt[]> {
    const availability = {
      email: this.emailProvider.isConfigured(),
      sms: this.smsProvider.isConfigured(),
      whatsapp: this.whatsappProvider.isConfigured(),
    };
    const channels = pickCustomerChannels(recipient, availability);

    if (channels.length === 0) {
      // Nominal channel — nothing was configured, so nothing was actually
      // attempted; this row exists purely so the trigger firing is visible
      // in the delivery log rather than silently disappearing.
      await this.log(
        tenantId,
        DeliveryChannel.EMAIL,
        event,
        recipient.email ?? recipient.mobile ?? 'unknown',
        DeliveryStatus.SKIPPED,
        'No messaging provider configured',
        related,
        dedupeKey,
      );
      return [{ channel: DeliveryChannel.EMAIL, status: DeliveryStatus.SKIPPED }];
    }

    const attempts: DeliveryAttempt[] = [];

    for (const channel of channels) {
      if (channel === 'EMAIL') {
        const result = await this.emailProvider.send(recipient.email as string, content.subject, content.body, attachments);
        const status = result.ok ? DeliveryStatus.SENT : DeliveryStatus.FAILED;
        await this.log(tenantId, DeliveryChannel.EMAIL, event, recipient.email as string, status, result.error, related, dedupeKey);
        attempts.push({ channel: DeliveryChannel.EMAIL, status });
      } else if (channel === 'WHATSAPP') {
        const result = await this.whatsappProvider.send(recipient.mobile as string, content.body);
        const status = result.ok ? DeliveryStatus.SENT : DeliveryStatus.FAILED;
        await this.log(tenantId, DeliveryChannel.WHATSAPP, event, recipient.mobile as string, status, result.error, related, dedupeKey);
        attempts.push({ channel: DeliveryChannel.WHATSAPP, status });
      } else if (channel === 'SMS') {
        const result = await this.smsProvider.send(recipient.mobile as string, content.body);
        const status = result.ok ? DeliveryStatus.SENT : DeliveryStatus.FAILED;
        await this.log(tenantId, DeliveryChannel.SMS, event, recipient.mobile as string, status, result.error, related, dedupeKey);
        attempts.push({ channel: DeliveryChannel.SMS, status });
      }
    }

    return attempts;
  }

  /**
   * Has a reminder for this exact threshold crossing already been sent?
   * (see DeliveryLog.dedupeKey's doc comment). Checked against ANY status
   * (SENT/FAILED/SKIPPED) — even a SKIPPED attempt (no provider configured)
   * still means this crossing was already considered, so retrying it daily
   * wouldn't accomplish anything; the next NEW crossing (different key)
   * will be considered again regardless.
   */
  async wasReminded(tenantId: string, event: string, dedupeKey: string): Promise<boolean> {
    const existing = await this.prisma.platform.deliveryLog.findFirst({ where: { tenantId, event, dedupeKey } });
    return existing !== null;
  }

  /** Internal ops ping to the workshop's own Slack, if configured — never customer-facing. */
  async notifyOps(tenantId: string, event: string, text: string, related: RelatedEntity): Promise<void> {
    const settings = await this.prisma.platform.tenantSettings.findUnique({ where: { tenantId } });
    if (!settings?.slackWebhookUrl) {
      await this.log(tenantId, DeliveryChannel.SLACK, event, 'ops', DeliveryStatus.SKIPPED, 'No Slack webhook configured', related);
      return;
    }
    const result = await this.slackProvider.send(settings.slackWebhookUrl, text);
    await this.log(
      tenantId,
      DeliveryChannel.SLACK,
      event,
      'ops',
      result.ok ? DeliveryStatus.SENT : DeliveryStatus.FAILED,
      result.error,
      related,
    );
  }

  private async log(
    tenantId: string,
    channel: DeliveryChannel,
    event: string,
    recipient: string,
    status: DeliveryStatus,
    errorMessage: string | undefined,
    related: RelatedEntity,
    dedupeKey?: string,
  ): Promise<void> {
    // Explicit tenantId + the unscoped `platform` client, not forTenant() —
    // this is called from both request-scoped triggers (appointment create,
    // estimate send, ...) AND the reminder cron, which runs with no
    // request/TenantContext at all, so it can't rely on AsyncLocalStorage
    // being populated (see prisma/tenant-context.ts).
    try {
      await this.prisma.platform.deliveryLog.create({
        data: {
          tenantId,
          channel,
          event,
          recipient,
          status,
          errorMessage,
          relatedEntityType: related.type,
          relatedEntityId: related.id,
          dedupeKey,
        },
      });
    } catch {
      // A logging failure (e.g. transient DB hiccup) must not surface as a
      // user-facing error on an otherwise-successful business operation.
    }
  }
}
