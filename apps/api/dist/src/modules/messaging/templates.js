"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentConfirmedMessage = appointmentConfirmedMessage;
exports.appointmentReminderMessage = appointmentReminderMessage;
exports.estimateReadyMessage = estimateReadyMessage;
exports.jobCardReadyMessage = jobCardReadyMessage;
exports.invoiceIssuedMessage = invoiceIssuedMessage;
exports.paymentReceivedMessage = paymentReceivedMessage;
exports.paymentLinkMessage = paymentLinkMessage;
function appointmentConfirmedMessage(ctx) {
    return {
        subject: `Appointment confirmed — ${ctx.workshopName}`,
        body: `Hi ${ctx.customerName}, your ${ctx.serviceType} appointment for ${ctx.vehicleLabel} is confirmed for ${ctx.appointmentDate} at ${ctx.appointmentTime}. — ${ctx.workshopName}`,
    };
}
function appointmentReminderMessage(ctx) {
    return {
        subject: `Reminder: appointment tomorrow — ${ctx.workshopName}`,
        body: `Hi ${ctx.customerName}, reminder: your ${ctx.serviceType} appointment for ${ctx.vehicleLabel} is tomorrow, ${ctx.appointmentDate} at ${ctx.appointmentTime}. — ${ctx.workshopName}`,
    };
}
function estimateReadyMessage(ctx) {
    return {
        subject: `Estimate ${ctx.estimateNumber} ready for approval — ${ctx.workshopName}`,
        body: `Hi ${ctx.customerName}, estimate ${ctx.estimateNumber} for ${ctx.vehicleLabel} (${ctx.grandTotal}) is ready for your approval. Please contact us to confirm. — ${ctx.workshopName}`,
    };
}
function jobCardReadyMessage(ctx) {
    return {
        subject: `Your vehicle is ready — ${ctx.workshopName}`,
        body: `Hi ${ctx.customerName}, your ${ctx.vehicleLabel} (job card ${ctx.jobCardNumber}) is ready for pickup. — ${ctx.workshopName}`,
    };
}
function invoiceIssuedMessage(ctx) {
    return {
        subject: `Invoice ${ctx.invoiceNumber} — ${ctx.workshopName}`,
        body: `Hi ${ctx.customerName}, invoice ${ctx.invoiceNumber} for ${ctx.grandTotal} has been generated. — ${ctx.workshopName}`,
    };
}
function paymentReceivedMessage(ctx) {
    return {
        subject: `Payment received — ${ctx.workshopName}`,
        body: `Hi ${ctx.customerName}, we've received your payment of ${ctx.amount} against invoice ${ctx.invoiceNumber}. Thank you! — ${ctx.workshopName}`,
    };
}
function paymentLinkMessage(ctx) {
    return {
        subject: `Pay invoice ${ctx.invoiceNumber} online — ${ctx.workshopName}`,
        body: `Hi ${ctx.customerName}, pay ${ctx.amount} for invoice ${ctx.invoiceNumber} online: ${ctx.paymentUrl} — ${ctx.workshopName}`,
    };
}
//# sourceMappingURL=templates.js.map