"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const rollup_payment_status_1 = require("../src/common/billing/rollup-payment-status");
const PURCHASE_INVOICE_STATUSES = {
    unpaid: client_1.PurchaseInvoiceStatus.UNPAID,
    partiallyPaid: client_1.PurchaseInvoiceStatus.PARTIALLY_PAID,
    paid: client_1.PurchaseInvoiceStatus.PAID,
};
const INVOICE_STATUSES = {
    unpaid: client_1.InvoiceStatus.UNPAID,
    partiallyPaid: client_1.InvoiceStatus.PARTIALLY_PAID,
    paid: client_1.InvoiceStatus.PAID,
};
describe('rollupPaymentStatus — generic across enums (PurchaseInvoiceStatus)', () => {
    it('returns UNPAID when nothing has been paid', () => {
        expect((0, rollup_payment_status_1.rollupPaymentStatus)(0, 5900, PURCHASE_INVOICE_STATUSES)).toBe(client_1.PurchaseInvoiceStatus.UNPAID);
    });
    it('returns PARTIALLY_PAID when some but not all has been paid', () => {
        expect((0, rollup_payment_status_1.rollupPaymentStatus)(2000, 5900, PURCHASE_INVOICE_STATUSES)).toBe(client_1.PurchaseInvoiceStatus.PARTIALLY_PAID);
    });
    it('returns PAID once payments meet the total', () => {
        expect((0, rollup_payment_status_1.rollupPaymentStatus)(5900, 5900, PURCHASE_INVOICE_STATUSES)).toBe(client_1.PurchaseInvoiceStatus.PAID);
    });
    it('returns PAID on an overpayment', () => {
        expect((0, rollup_payment_status_1.rollupPaymentStatus)(6000, 5900, PURCHASE_INVOICE_STATUSES)).toBe(client_1.PurchaseInvoiceStatus.PAID);
    });
    it('accepts Prisma.Decimal inputs the same as numbers', () => {
        const status = (0, rollup_payment_status_1.rollupPaymentStatus)(new client_1.Prisma.Decimal('5900'), new client_1.Prisma.Decimal('5900'), PURCHASE_INVOICE_STATUSES);
        expect(status).toBe(client_1.PurchaseInvoiceStatus.PAID);
    });
    it('does not treat a zero-total invoice as PAID', () => {
        expect((0, rollup_payment_status_1.rollupPaymentStatus)(0, 0, PURCHASE_INVOICE_STATUSES)).toBe(client_1.PurchaseInvoiceStatus.UNPAID);
    });
});
describe('rollupPaymentStatus — the same function, instantiated with the distinct InvoiceStatus enum', () => {
    it('returns UNPAID when nothing has been paid', () => {
        expect((0, rollup_payment_status_1.rollupPaymentStatus)(0, 11800, INVOICE_STATUSES)).toBe(client_1.InvoiceStatus.UNPAID);
    });
    it('returns PARTIALLY_PAID when some but not all has been paid', () => {
        expect((0, rollup_payment_status_1.rollupPaymentStatus)(5000, 11800, INVOICE_STATUSES)).toBe(client_1.InvoiceStatus.PARTIALLY_PAID);
    });
    it('returns PAID once payments meet the total', () => {
        expect((0, rollup_payment_status_1.rollupPaymentStatus)(11800, 11800, INVOICE_STATUSES)).toBe(client_1.InvoiceStatus.PAID);
    });
});
//# sourceMappingURL=rollup-payment-status.spec.js.map