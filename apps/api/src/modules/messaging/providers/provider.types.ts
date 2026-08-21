export interface SendResult {
  ok: boolean;
  error?: string;
}

/** Email-only — SMS/WhatsApp providers don't accept attachments (see MessagingService.notifyCustomer). */
export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}
