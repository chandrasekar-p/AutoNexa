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
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function renderEmailHtml(opts) {
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