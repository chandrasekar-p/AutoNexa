"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateGstSplit = calculateGstSplit;
exports.computeRoundOff = computeRoundOff;
const client_1 = require("@prisma/client");
function calculateGstSplit(lineItems, tenantState, customerState) {
    const isInterState = !!tenantState && !!customerState && tenantState.trim().toLowerCase() !== customerState.trim().toLowerCase();
    let subtotal = new client_1.Prisma.Decimal(0);
    let cgstAmount = new client_1.Prisma.Decimal(0);
    let sgstAmount = new client_1.Prisma.Decimal(0);
    let igstAmount = new client_1.Prisma.Decimal(0);
    for (const item of lineItems) {
        const lineTotal = new client_1.Prisma.Decimal(item.lineTotal);
        const lineGst = lineTotal.mul(item.gstRate).div(100);
        subtotal = subtotal.add(lineTotal);
        if (isInterState) {
            igstAmount = igstAmount.add(lineGst);
        }
        else {
            const half = lineGst.div(2);
            cgstAmount = cgstAmount.add(half);
            sgstAmount = sgstAmount.add(half);
        }
    }
    return {
        subtotal: subtotal.toDecimalPlaces(2),
        cgstAmount: cgstAmount.toDecimalPlaces(2),
        sgstAmount: sgstAmount.toDecimalPlaces(2),
        igstAmount: igstAmount.toDecimalPlaces(2),
    };
}
function computeRoundOff(unroundedGrandTotal) {
    const unrounded = new client_1.Prisma.Decimal(unroundedGrandTotal);
    const rounded = unrounded.toDecimalPlaces(0, client_1.Prisma.Decimal.ROUND_HALF_UP);
    return {
        roundOff: rounded.sub(unrounded).toDecimalPlaces(2),
        grandTotal: rounded.toDecimalPlaces(2),
    };
}
//# sourceMappingURL=gst-split.js.map