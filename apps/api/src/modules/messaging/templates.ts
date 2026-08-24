/**
 * Pure message-text builders, one per customer-facing event. Kept free of
 * any provider/IO concerns so they're trivially unit-testable — see
 * test/messaging-templates.spec.ts.
 */

export interface MessageContent {
  subject: string;
  body: string;
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
