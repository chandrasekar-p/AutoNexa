"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOverpayment = isOverpayment;
const client_1 = require("@prisma/client");
function isOverpayment(totalPaidSoFar, grandTotal, newPaymentAmount) {
    const projectedTotal = new client_1.Prisma.Decimal(totalPaidSoFar).add(newPaymentAmount);
    return projectedTotal.gt(new client_1.Prisma.Decimal(grandTotal));
}
//# sourceMappingURL=payment-guard.js.map