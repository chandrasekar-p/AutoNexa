"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeInvoiceGst = summarizeInvoiceGst;
const client_1 = require("@prisma/client");
function summarizeInvoiceGst(lines) {
    let subtotal = new client_1.Prisma.Decimal(0);
    let cgstAmount = new client_1.Prisma.Decimal(0);
    let sgstAmount = new client_1.Prisma.Decimal(0);
    let igstAmount = new client_1.Prisma.Decimal(0);
    let grandTotal = new client_1.Prisma.Decimal(0);
    for (const line of lines) {
        subtotal = subtotal.add(line.subtotal);
        cgstAmount = cgstAmount.add(line.cgstAmount);
        sgstAmount = sgstAmount.add(line.sgstAmount);
        igstAmount = igstAmount.add(line.igstAmount);
        grandTotal = grandTotal.add(line.grandTotal);
    }
    return {
        invoiceCount: lines.length,
        subtotal: subtotal.toDecimalPlaces(2),
        cgstAmount: cgstAmount.toDecimalPlaces(2),
        sgstAmount: sgstAmount.toDecimalPlaces(2),
        igstAmount: igstAmount.toDecimalPlaces(2),
        totalGst: cgstAmount.add(sgstAmount).add(igstAmount).toDecimalPlaces(2),
        grandTotal: grandTotal.toDecimalPlaces(2),
    };
}
//# sourceMappingURL=gst-summary.js.map