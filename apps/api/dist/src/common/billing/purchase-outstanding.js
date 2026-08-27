"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computePurchaseInvoiceOutstanding = computePurchaseInvoiceOutstanding;
exports.sumPurchaseOutstanding = sumPurchaseOutstanding;
const client_1 = require("@prisma/client");
function computePurchaseInvoiceOutstanding(invoice) {
    const paid = invoice.payments.reduce((sum, p) => sum.add(p.amount), new client_1.Prisma.Decimal(0));
    return new client_1.Prisma.Decimal(invoice.total).sub(paid).toDecimalPlaces(2);
}
function sumPurchaseOutstanding(invoices) {
    return invoices
        .filter((inv) => inv.status === client_1.PurchaseInvoiceStatus.UNPAID || inv.status === client_1.PurchaseInvoiceStatus.PARTIALLY_PAID)
        .reduce((sum, inv) => sum.add(inv.outstanding), new client_1.Prisma.Decimal(0));
}
//# sourceMappingURL=purchase-outstanding.js.map