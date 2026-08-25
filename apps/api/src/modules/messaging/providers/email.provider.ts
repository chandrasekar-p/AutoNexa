import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailAttachment, SendResult } from './provider.types';

@Injectable()
export class EmailProvider {
  private readonly transporter: nodemailer.Transporter | null;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('messaging.smtp.host');
    this.fromEmail = this.config.get<string>('messaging.smtp.fromEmail') ?? 'no-reply@autonexa.app';
    this.fromName = this.config.get<string>('messaging.smtp.fromName') ?? 'AutoNexa';

    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port: this.config.get<number>('messaging.smtp.port'),
          auth: {
            user: this.config.get<string>('messaging.smtp.user'),
            pass: this.config.get<string>('messaging.smtp.password'),
          },
        })
      : null;
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  async send(to: string, subject: string, body: string, attachments?: EmailAttachment[], html?: string): Promise<SendResult> {
    if (!this.transporter) return { ok: false, error: 'SMTP not configured' };
    try {
      // `text` is always sent alongside `html` (nodemailer builds a proper
      // multipart/alternative message) — every mail client that can't or
      // won't render HTML still gets the plain-text version, not nothing.
      await this.transporter.sendMail({ from: `"${this.fromName}" <${this.fromEmail}>`, to, subject, text: body, html, attachments });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown email error' };
    }
  }
}
