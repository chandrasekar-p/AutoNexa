import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import { SendResult } from './provider.types';

@Injectable()
export class SmsProvider {
  private readonly client: ReturnType<typeof twilio> | null;
  private readonly fromNumber: string | undefined;

  constructor(private readonly config: ConfigService) {
    const accountSid = this.config.get<string>('messaging.twilio.accountSid');
    const authToken = this.config.get<string>('messaging.twilio.authToken');
    this.fromNumber = this.config.get<string>('messaging.twilio.fromNumber');

    this.client = accountSid && authToken && this.fromNumber ? twilio(accountSid, authToken) : null;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async send(to: string, body: string): Promise<SendResult> {
    if (!this.client || !this.fromNumber) return { ok: false, error: 'Twilio not configured' };
    try {
      await this.client.messages.create({ to, from: this.fromNumber, body });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown SMS error' };
    }
  }
}
