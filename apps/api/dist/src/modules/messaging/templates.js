"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentConfirmedMessage = appointmentConfirmedMessage;
exports.appointmentReminderMessage = appointmentReminderMessage;
exports.estimateReadyMessage = estimateReadyMessage;
exports.jobCardReadyMessage = jobCardReadyMessage;
exports.invoiceIssuedMessage = invoiceIssuedMessage;
exports.paymentReceivedMessage = paymentReceivedMessage;
exports.paymentLinkMessage = paymentLinkMessage;
exports.insuranceExpiringMessage = insuranceExpiringMessage;
exports.pucExpiringMessage = pucExpiringMessage;
exports.serviceDueMessage = serviceDueMessage;
exports.packageExpiringMessage = packageExpiringMessage;
exports.pointsEarnedMessage = pointsEarnedMessage;
exports.warrantyClaimDecidedMessage = warrantyClaimDecidedMessage;
exports.packageCancelledMessage = packageCancelledMessage;
exports.loyaltyAdjustmentMessage = loyaltyAdjustmentMessage;
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
        body: `Hi ${ctx.customerName}, estimate ${ctx.estimateNumber} for ${ctx.vehicleLabel} (${ctx.grandTotal}) is ready for your approval: ${ctx.approvalUrl} — ${ctx.workshopName}`,
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
function insuranceExpiringMessage(ctx) {
    return {
        subject: `Insurance expiring soon — ${ctx.workshopName}`,
        body: `Hi ${ctx.customerName}, your ${ctx.vehicleLabel}'s insurance expires on ${ctx.expiryDate}. Please renew it in time. — ${ctx.workshopName}`,
    };
}
function pucExpiringMessage(ctx) {
    return {
        subject: `PUC certificate expiring soon — ${ctx.workshopName}`,
        body: `Hi ${ctx.customerName}, your ${ctx.vehicleLabel}'s PUC certificate expires on ${ctx.expiryDate}. Please renew it in time. — ${ctx.workshopName}`,
    };
}
function serviceDueMessage(ctx) {
    return {
        subject: `Service due soon — ${ctx.workshopName}`,
        body: `Hi ${ctx.customerName}, your ${ctx.vehicleLabel} is due for its next service ${ctx.dueReason}. Book an appointment at your convenience. — ${ctx.workshopName}`,
    };
}
function packageExpiringMessage(ctx) {
    return {
        subject: `Your service package is expiring soon — ${ctx.workshopName}`,
        body: `Hi ${ctx.customerName}, your "${ctx.packageName}" package for ${ctx.vehicleLabel} expires on ${ctx.expiryDate}. Contact us to renew it. — ${ctx.workshopName}`,
    };
}
function pointsEarnedMessage(ctx) {
    return {
        subject: `You earned loyalty points — ${ctx.workshopName}`,
        body: `Hi ${ctx.customerName}, you earned ${ctx.points} loyalty points on your recent visit. Your balance is now ${ctx.balance} points. — ${ctx.workshopName}`,
    };
}
function warrantyClaimDecidedMessage(ctx) {
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
function packageCancelledMessage(ctx) {
    return {
        subject: `Your service package has been cancelled — ${ctx.workshopName}`,
        body: `Hi ${ctx.customerName}, your "${ctx.packageName}" package has been cancelled. Contact us if you have any questions. — ${ctx.workshopName}`,
    };
}
function loyaltyAdjustmentMessage(ctx) {
    const direction = ctx.points > 0 ? `credited with ${ctx.points}` : `debited ${Math.abs(ctx.points)}`;
    return {
        subject: `Your loyalty points balance was updated — ${ctx.workshopName}`,
        body: `Hi ${ctx.customerName}, your loyalty account was ${direction} points. Your balance is now ${ctx.balance} points. — ${ctx.workshopName}`,
    };
}
//# sourceMappingURL=templates.js.map