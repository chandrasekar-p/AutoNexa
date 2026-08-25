/**
 * Pure message-text builders, one per customer-facing event. Kept free of
 * any provider/IO concerns so they're trivially unit-testable — see
 * test/messaging-templates.spec.ts.
 */

export interface MessageContent {
  subject: string;
  /** Plain text — always sent, used as-is for SMS/WhatsApp and as the multipart fallback for EMAIL. */
  body: string;
  /** Optional branded HTML alternative — EMAIL only (see EmailProvider.send). Not every template has one yet; a template without `html` just sends the same plain-text `body` it always has. */
  html?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface EmailLayoutOptions {
  workshopName: string;
  /** Hidden preview text shown next to the subject in most inbox lists — kept short, no visible rendering. */
  preheader: string;
  heading: string;
  /** Rendered as separate paragraphs, in order. */
  bodyLines: string[];
  cta?: { label: string; url: string };
  footerNote?: string;
}

/**
 * Shared branded HTML shell — AutoNexa wordmark header, workshop name +
 * heading, body paragraphs, an optional CTA button, footer. Table-based
 * layout with every style inline (no external stylesheet, no `<style>`
 * block relied on) since that's what actually renders consistently across
 * real inbox clients (Gmail, Outlook, Apple Mail), not just a browser.
 * Colors match the app's own accent/ink/canvas/line tokens
 * (tailwind.config.ts / globals.css) hardcoded here since email HTML can't
 * read CSS custom properties.
 */
function renderEmailHtml(opts: EmailLayoutOptions): string {
  const { workshopName, preheader, heading, bodyLines, cta, footerNote } = opts;
  const paragraphs = bodyLines
    .map((line) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1a1815;">${escapeHtml(line)}</p>`)
    .join('');
  const ctaHtml = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">
        <tr><td style="border-radius:8px;background-color:#c07333;">
          <a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(cta.label)}</a>
        </td></tr>
      </table>`
    : '';

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#faf8f3;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none;font-size:1px;color:#faf8f3;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf8f3;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border:1px solid #e7e2d6;border-radius:12px;overflow:hidden;">
          <tr><td style="background-color:#1a1815;padding:20px 28px;">
            <span style="font-size:16px;font-weight:700;color:#ffffff;letter-spacing:0.02em;">AutoNexa</span>
          </td></tr>
          <tr><td style="padding:28px;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:#c07333;">${escapeHtml(workshopName)}</p>
            <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#1a1815;">${escapeHtml(heading)}</h1>
            ${paragraphs}
            ${ctaHtml}
          </td></tr>
          <tr><td style="border-top:1px solid #e7e2d6;padding:16px 28px;">
            <p style="margin:0;font-size:12px;color:#9c9686;">${escapeHtml(footerNote ?? "This is an automated message — please don't reply directly to this email.")}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export interface AppointmentTemplateContext {
  workshopName: string;
  customerName: string;
  vehicleLabel: string;
  serviceType: string;
  appointmentDate: string;
  appointmentTime: string;
}

export interface EstimateTemplateContext {
  workshopName: string;
  customerName: string;
  vehicleLabel: string;
  estimateNumber: string;
  grandTotal: string;
  approvalUrl: string;
}

export interface JobCardReadyTemplateContext {
  workshopName: string;
  customerName: string;
  vehicleLabel: string;
  jobCardNumber: string;
}

export interface InvoiceTemplateContext {
  workshopName: string;
  customerName: string;
  invoiceNumber: string;
  grandTotal: string;
}

export interface PaymentTemplateContext {
  workshopName: string;
  customerName: string;
  invoiceNumber: string;
  amount: string;
}

export interface PaymentLinkTemplateContext {
  workshopName: string;
  customerName: string;
  invoiceNumber: string;
  amount: string;
  paymentUrl: string;
}

export interface VehicleReminderTemplateContext {
  workshopName: string;
  customerName: string;
  vehicleLabel: string;
  expiryDate: string;
}

export interface ServiceDueTemplateContext {
  workshopName: string;
  customerName: string;
  vehicleLabel: string;
  // A pre-built phrase, not raw data — e.g. "in about 6 months" or "based on your odometer reading".
  dueReason: string;
}

export function appointmentConfirmedMessage(ctx: AppointmentTemplateContext): MessageContent {
  return {
    subject: `Appointment confirmed — ${ctx.workshopName}`,
    body: `Hi ${ctx.customerName}, your ${ctx.serviceType} appointment for ${ctx.vehicleLabel} is confirmed for ${ctx.appointmentDate} at ${ctx.appointmentTime}. — ${ctx.workshopName}`,
  };
}

export function appointmentReminderMessage(ctx: AppointmentTemplateContext): MessageContent {
  return {
    subject: `Reminder: appointment tomorrow — ${ctx.workshopName}`,
    body: `Hi ${ctx.customerName}, reminder: your ${ctx.serviceType} appointment for ${ctx.vehicleLabel} is tomorrow, ${ctx.appointmentDate} at ${ctx.appointmentTime}. — ${ctx.workshopName}`,
  };
}

export function estimateReadyMessage(ctx: EstimateTemplateContext): MessageContent {
  return {
    subject: `Estimate ${ctx.estimateNumber} ready for approval — ${ctx.workshopName}`,
    body: `Hi ${ctx.customerName}, estimate ${ctx.estimateNumber} for ${ctx.vehicleLabel} (${ctx.grandTotal}) is ready for your approval: ${ctx.approvalUrl} — ${ctx.workshopName}`,
    html: renderEmailHtml({
      workshopName: ctx.workshopName,
      preheader: `Estimate ${ctx.estimateNumber} for ${ctx.vehicleLabel} — ${ctx.grandTotal}`,
      heading: 'Your estimate is ready for approval',
      bodyLines: [
        `Hi ${ctx.customerName}, we've put together an estimate for ${ctx.vehicleLabel}. Please review the details and approve it so we can get started.`,
        `Estimate ${ctx.estimateNumber} · ${ctx.grandTotal}`,
      ],
      cta: { label: 'Review & Approve Estimate', url: ctx.approvalUrl },
    }),
  };
}

export function jobCardReadyMessage(ctx: JobCardReadyTemplateContext): MessageContent {
  return {
    subject: `Your vehicle is ready — ${ctx.workshopName}`,
    body: `Hi ${ctx.customerName}, your ${ctx.vehicleLabel} (job card ${ctx.jobCardNumber}) is ready for pickup. — ${ctx.workshopName}`,
  };
}

export function invoiceIssuedMessage(ctx: InvoiceTemplateContext): MessageContent {
  return {
    subject: `Invoice ${ctx.invoiceNumber} — ${ctx.workshopName}`,
    body: `Hi ${ctx.customerName}, invoice ${ctx.invoiceNumber} for ${ctx.grandTotal} has been generated. — ${ctx.workshopName}`,
  };
}

export function paymentReceivedMessage(ctx: PaymentTemplateContext): MessageContent {
  return {
    subject: `Payment received — ${ctx.workshopName}`,
    body: `Hi ${ctx.customerName}, we've received your payment of ${ctx.amount} against invoice ${ctx.invoiceNumber}. Thank you! — ${ctx.workshopName}`,
  };
}

export function paymentLinkMessage(ctx: PaymentLinkTemplateContext): MessageContent {
  return {
    subject: `Pay invoice ${ctx.invoiceNumber} online — ${ctx.workshopName}`,
    body: `Hi ${ctx.customerName}, pay ${ctx.amount} for invoice ${ctx.invoiceNumber} online: ${ctx.paymentUrl} — ${ctx.workshopName}`,
  };
}

export function insuranceExpiringMessage(ctx: VehicleReminderTemplateContext): MessageContent {
  return {
    subject: `Insurance expiring soon — ${ctx.workshopName}`,
    body: `Hi ${ctx.customerName}, your ${ctx.vehicleLabel}'s insurance expires on ${ctx.expiryDate}. Please renew it in time. — ${ctx.workshopName}`,
  };
}

export function pucExpiringMessage(ctx: VehicleReminderTemplateContext): MessageContent {
  return {
    subject: `PUC certificate expiring soon — ${ctx.workshopName}`,
    body: `Hi ${ctx.customerName}, your ${ctx.vehicleLabel}'s PUC certificate expires on ${ctx.expiryDate}. Please renew it in time. — ${ctx.workshopName}`,
  };
}

export function serviceDueMessage(ctx: ServiceDueTemplateContext): MessageContent {
  return {
    subject: `Service due soon — ${ctx.workshopName}`,
    body: `Hi ${ctx.customerName}, your ${ctx.vehicleLabel} is due for its next service ${ctx.dueReason}. Book an appointment at your convenience. — ${ctx.workshopName}`,
  };
}

export interface PackageExpiringTemplateContext {
  workshopName: string;
  customerName: string;
  packageName: string;
  vehicleLabel: string;
  expiryDate: string;
}

export function packageExpiringMessage(ctx: PackageExpiringTemplateContext): MessageContent {
  return {
    subject: `Your service package is expiring soon — ${ctx.workshopName}`,
    body: `Hi ${ctx.customerName}, your "${ctx.packageName}" package for ${ctx.vehicleLabel} expires on ${ctx.expiryDate}. Contact us to renew it. — ${ctx.workshopName}`,
  };
}

export interface PointsEarnedTemplateContext {
  workshopName: string;
  customerName: string;
  points: string;
  balance: string;
}

export function pointsEarnedMessage(ctx: PointsEarnedTemplateContext): MessageContent {
  return {
    subject: `You earned loyalty points — ${ctx.workshopName}`,
    body: `Hi ${ctx.customerName}, you earned ${ctx.points} loyalty points on your recent visit. Your balance is now ${ctx.balance} points. — ${ctx.workshopName}`,
  };
}

export interface WarrantyClaimDecidedTemplateContext {
  workshopName: string;
  customerName: string;
  itemLabel: string;
  approved: boolean;
  isBillable: boolean;
}

export function warrantyClaimDecidedMessage(ctx: WarrantyClaimDecidedTemplateContext): MessageContent {
  const outcome = ctx.approved
    ? ctx.isBillable
      ? 'approved — this will be billed as a regular repair'
      : 'approved and covered under warranty at no charge'
    : 'not covered under warranty';
  return {
    subject: `Your warranty claim has been reviewed — ${ctx.workshopName}`,
    body: `Hi ${ctx.customerName}, your warranty claim for "${ctx.itemLabel}" has been ${outcome}. — ${ctx.workshopName}`,
  };
}

export interface PackageCancelledTemplateContext {
  workshopName: string;
  customerName: string;
  packageName: string;
}

export function packageCancelledMessage(ctx: PackageCancelledTemplateContext): MessageContent {
  return {
    subject: `Your service package has been cancelled — ${ctx.workshopName}`,
    body: `Hi ${ctx.customerName}, your "${ctx.packageName}" package has been cancelled. Contact us if you have any questions. — ${ctx.workshopName}`,
  };
}

export interface LoyaltyAdjustmentTemplateContext {
  workshopName: string;
  customerName: string;
  points: number;
  balance: string;
}

export function loyaltyAdjustmentMessage(ctx: LoyaltyAdjustmentTemplateContext): MessageContent {
  const direction = ctx.points > 0 ? `credited with ${ctx.points}` : `debited ${Math.abs(ctx.points)}`;
  return {
    subject: `Your loyalty points balance was updated — ${ctx.workshopName}`,
    body: `Hi ${ctx.customerName}, your loyalty account was ${direction} points. Your balance is now ${ctx.balance} points. — ${ctx.workshopName}`,
  };
}
