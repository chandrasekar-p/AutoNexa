"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateLineTotal = calculateLineTotal;
exports.calculateEstimateTotals = calculateEstimateTotals;
const client_1 = require("@prisma/client");
function calculateLineTotal(quantity, unitPrice) {
    return new client_1.Prisma.Decimal(quantity).mul(unitPrice).toDecimalPlaces(2);
}
function calculateEstimateTotals(lineItems, discountAmount = 0) {
    let subtotal = new client_1.Prisma.Decimal(0);
    let taxAmount = new client_1.Prisma.Decimal(0);
    for (const item of lineItems) {
        const lineTotal = calculateLineTotal(item.quantity, item.unitPrice);
        subtotal = subtotal.add(lineTotal);
        taxAmount = taxAmount.add(lineTotal.mul(item.gstRate).div(100));
    }
    subtotal = subtotal.toDecimalPlaces(2);
    taxAmount = taxAmount.toDecimalPlaces(2);
    const total = client_1.Prisma.Decimal.max(0, subtotal.add(taxAmount).sub(new client_1.Prisma.Decimal(discountAmount))).toDecimalPlaces(2);
    return { subtotal, taxAmount, total };
}
//# sourceMappingURL=estimate-totals.js.map