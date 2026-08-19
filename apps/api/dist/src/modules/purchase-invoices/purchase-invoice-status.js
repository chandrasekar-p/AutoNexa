"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollupPurchaseInvoiceStatus = rollupPurchaseInvoiceStatus;
const client_1 = require("@prisma/client");
function rollupPurchaseInvoiceStatus(totalPaid, invoiceTotal) {
    const paid = new client_1.Prisma.Decimal(totalPaid);
    const total = new client_1.Prisma.Decimal(invoiceTotal);
    if (total.gt(0) && paid.gte(total))
        return client_1.PurchaseInvoiceStatus.PAID;
    if (paid.gt(0))
        return client_1.PurchaseInvoiceStatus.PARTIALLY_PAID;
    return client_1.PurchaseInvoiceStatus.UNPAID;
}
//# sourceMappingURL=purchase-invoice-status.js.map