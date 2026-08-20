"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeInvoiceOutstanding = computeInvoiceOutstanding;
exports.sumOutstanding = sumOutstanding;
const client_1 = require("@prisma/client");
function computeInvoiceOutstanding(invoice) {
    const paid = invoice.payments.reduce((sum, p) => sum.add(p.amount), new client_1.Prisma.Decimal(0));
    return new client_1.Prisma.Decimal(invoice.grandTotal).sub(paid).toDecimalPlaces(2);
}
function sumOutstanding(invoices) {
    return invoices
        .filter((inv) => inv.status === client_1.InvoiceStatus.UNPAID || inv.status === client_1.InvoiceStatus.PARTIALLY_PAID)
        .reduce((sum, inv) => sum.add(inv.outstanding), new client_1.Prisma.Decimal(0));
}
//# sourceMappingURL=outstanding.js.map