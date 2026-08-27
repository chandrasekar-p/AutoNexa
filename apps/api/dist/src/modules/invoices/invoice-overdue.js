"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INVOICE_DISPLAY_STATUSES = void 0;
exports.deriveInvoiceDisplayStatus = deriveInvoiceDisplayStatus;
exports.computeOverdueDays = computeOverdueDays;
exports.invoiceDisplayStatusWhere = invoiceDisplayStatusWhere;
const client_1 = require("@prisma/client");
exports.INVOICE_DISPLAY_STATUSES = ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED', 'OVERDUE'];
const SETTLED_STATUSES = [client_1.InvoiceStatus.PAID, client_1.InvoiceStatus.REFUNDED];
function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function deriveInvoiceDisplayStatus(status, dueDate, now = new Date()) {
    if (SETTLED_STATUSES.includes(status))
        return status;
    if (dueDate && startOfDay(dueDate) < startOfDay(now))
        return 'OVERDUE';
    return status;
}
function computeOverdueDays(dueDate, now = new Date()) {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.max(0, Math.floor((startOfDay(now).getTime() - startOfDay(dueDate).getTime()) / msPerDay));
}
function invoiceDisplayStatusWhere(displayStatus, now = new Date()) {
    const cutoff = startOfDay(now);
    switch (displayStatus) {
        case 'PAID':
            return { status: client_1.InvoiceStatus.PAID };
        case 'REFUNDED':
            return { status: client_1.InvoiceStatus.REFUNDED };
        case 'OVERDUE':
            return { status: { in: [client_1.InvoiceStatus.UNPAID, client_1.InvoiceStatus.PARTIALLY_PAID] }, dueDate: { lt: cutoff } };
        case 'UNPAID':
            return { status: client_1.InvoiceStatus.UNPAID, OR: [{ dueDate: null }, { dueDate: { gte: cutoff } }] };
        case 'PARTIALLY_PAID':
            return { status: client_1.InvoiceStatus.PARTIALLY_PAID, OR: [{ dueDate: null }, { dueDate: { gte: cutoff } }] };
    }
}
//# sourceMappingURL=invoice-overdue.js.map