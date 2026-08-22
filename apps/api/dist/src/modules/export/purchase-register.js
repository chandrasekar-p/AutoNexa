"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPurchaseRegisterRows = buildPurchaseRegisterRows;
exports.summarizePurchaseItc = summarizePurchaseItc;
exports.countMissingSupplierGstin = countMissingSupplierGstin;
const client_1 = require("@prisma/client");
function buildPurchaseRegisterRows(invoices) {
    return invoices.map((invoice) => ({
        supplierName: invoice.supplierName,
        supplierGstin: invoice.supplierGstin ?? 'UNREGISTERED',
        supplierInvoiceNumber: invoice.supplierInvoiceNumber,
        invoiceDate: invoice.invoiceDate.toISOString().slice(0, 10),
        taxableValue: new client_1.Prisma.Decimal(invoice.subtotal).toDecimalPlaces(2),
        taxAmount: new client_1.Prisma.Decimal(invoice.taxAmount).toDecimalPlaces(2),
        total: new client_1.Prisma.Decimal(invoice.total).toDecimalPlaces(2),
    }));
}
function summarizePurchaseItc(invoices) {
    let taxableValue = new client_1.Prisma.Decimal(0);
    let taxAmount = new client_1.Prisma.Decimal(0);
    let total = new client_1.Prisma.Decimal(0);
    for (const invoice of invoices) {
        taxableValue = taxableValue.add(invoice.subtotal);
        taxAmount = taxAmount.add(invoice.taxAmount);
        total = total.add(invoice.total);
    }
    return {
        invoiceCount: invoices.length,
        taxableValue: taxableValue.toDecimalPlaces(2),
        taxAmount: taxAmount.toDecimalPlaces(2),
        total: total.toDecimalPlaces(2),
    };
}
function countMissingSupplierGstin(invoices) {
    return invoices.filter((i) => !i.supplierGstin).length;
}
//# sourceMappingURL=purchase-register.js.map