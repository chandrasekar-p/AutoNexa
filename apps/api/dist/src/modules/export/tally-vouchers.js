"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSalesVoucher = buildSalesVoucher;
exports.buildReceiptVoucher = buildReceiptVoucher;
exports.buildPurchaseVoucher = buildPurchaseVoucher;
exports.buildPaymentVoucher = buildPaymentVoucher;
const client_1 = require("@prisma/client");
const LEDGER = {
    SALES: 'Sales Account',
    OUTPUT_CGST: 'Output CGST',
    OUTPUT_SGST: 'Output SGST',
    OUTPUT_IGST: 'Output IGST',
    ROUND_OFF: 'Round Off',
    PURCHASE: 'Purchase Account',
    INPUT_CGST: 'Input CGST',
    INPUT_SGST: 'Input SGST',
    CASH: 'Cash',
    BANK: 'Bank Account',
};
function bankLedgerForMethod(method) {
    return method === 'cash' ? LEDGER.CASH : LEDGER.BANK;
}
function isPositive(amount) {
    return new client_1.Prisma.Decimal(amount).greaterThan(0);
}
function buildSalesVoucher(invoice) {
    const ledgerEntries = [
        { ledgerName: invoice.customerName, amount: invoice.grandTotal, isDebit: true },
        { ledgerName: LEDGER.SALES, amount: invoice.subtotal, isDebit: false },
    ];
    if (isPositive(invoice.cgstAmount))
        ledgerEntries.push({ ledgerName: LEDGER.OUTPUT_CGST, amount: invoice.cgstAmount, isDebit: false });
    if (isPositive(invoice.sgstAmount))
        ledgerEntries.push({ ledgerName: LEDGER.OUTPUT_SGST, amount: invoice.sgstAmount, isDebit: false });
    if (isPositive(invoice.igstAmount))
        ledgerEntries.push({ ledgerName: LEDGER.OUTPUT_IGST, amount: invoice.igstAmount, isDebit: false });
    const roundOff = new client_1.Prisma.Decimal(invoice.roundOff);
    if (!roundOff.equals(0)) {
        ledgerEntries.push({ ledgerName: LEDGER.ROUND_OFF, amount: roundOff.abs(), isDebit: roundOff.lessThan(0) });
    }
    return {
        voucherType: 'Sales',
        voucherNumber: invoice.invoiceNumber,
        date: invoice.invoiceDate,
        partyLedgerName: invoice.customerName,
        ledgerEntries,
    };
}
function buildReceiptVoucher(payment) {
    return {
        voucherType: 'Receipt',
        voucherNumber: payment.reference,
        date: payment.paymentDate,
        partyLedgerName: payment.customerName,
        ledgerEntries: [
            { ledgerName: bankLedgerForMethod(payment.method), amount: payment.amount, isDebit: true },
            { ledgerName: payment.customerName, amount: payment.amount, isDebit: false },
        ],
    };
}
function buildPurchaseVoucher(invoice) {
    const ledgerEntries = [{ ledgerName: LEDGER.PURCHASE, amount: invoice.subtotal, isDebit: true }];
    const tax = new client_1.Prisma.Decimal(invoice.taxAmount);
    if (tax.greaterThan(0)) {
        const half = tax.div(2).toDecimalPlaces(2);
        ledgerEntries.push({ ledgerName: LEDGER.INPUT_CGST, amount: half, isDebit: true });
        ledgerEntries.push({ ledgerName: LEDGER.INPUT_SGST, amount: tax.sub(half), isDebit: true });
    }
    ledgerEntries.push({ ledgerName: invoice.supplierName, amount: invoice.total, isDebit: false });
    return {
        voucherType: 'Purchase',
        voucherNumber: invoice.supplierInvoiceNumber,
        date: invoice.invoiceDate,
        partyLedgerName: invoice.supplierName,
        ledgerEntries,
    };
}
function buildPaymentVoucher(payment) {
    return {
        voucherType: 'Payment',
        voucherNumber: payment.reference,
        date: payment.paymentDate,
        partyLedgerName: payment.supplierName,
        ledgerEntries: [
            { ledgerName: payment.supplierName, amount: payment.amount, isDebit: true },
            { ledgerName: bankLedgerForMethod(payment.method), amount: payment.amount, isDebit: false },
        ],
    };
}
//# sourceMappingURL=tally-vouchers.js.map