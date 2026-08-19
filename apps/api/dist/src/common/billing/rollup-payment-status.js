"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollupPaymentStatus = rollupPaymentStatus;
const client_1 = require("@prisma/client");
function rollupPaymentStatus(totalPaid, total, statuses) {
    const paid = new client_1.Prisma.Decimal(totalPaid);
    const grandTotal = new client_1.Prisma.Decimal(total);
    if (grandTotal.gt(0) && paid.gte(grandTotal))
        return statuses.paid;
    if (paid.gt(0))
        return statuses.partiallyPaid;
    return statuses.unpaid;
}
//# sourceMappingURL=rollup-payment-status.js.map