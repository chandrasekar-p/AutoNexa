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
    body: `Hi ${ctx.customerName}, estimate ${ctx.estimateNumber} for ${ctx.vehicleLabel} (${ctx.grandTotal}) is ready for your approval. Please contact us to confirm. — ${ctx.workshopName}`,
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
