"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const purchase_invoice_status_1 = require("../src/modules/purchase-invoices/purchase-invoice-status");
describe('rollupPurchaseInvoiceStatus', () => {
    it('returns UNPAID when nothing has been paid', () => {
        expect((0, purchase_invoice_status_1.rollupPurchaseInvoiceStatus)(0, 5900)).toBe(client_1.PurchaseInvoiceStatus.UNPAID);
    });
    it('returns PARTIALLY_PAID when some but not all has been paid', () => {
        expect((0, purchase_invoice_status_1.rollupPurchaseInvoiceStatus)(2000, 5900)).toBe(client_1.PurchaseInvoiceStatus.PARTIALLY_PAID);
    });
    it('returns PAID once payments meet the total', () => {
        expect((0, purchase_invoice_status_1.rollupPurchaseInvoiceStatus)(5900, 5900)).toBe(client_1.PurchaseInvoiceStatus.PAID);
    });
    it('returns PAID on an overpayment', () => {
        expect((0, purchase_invoice_status_1.rollupPurchaseInvoiceStatus)(6000, 5900)).toBe(client_1.PurchaseInvoiceStatus.PAID);
    });
    it('accepts Prisma.Decimal inputs the same as numbers', () => {
        const status = (0, purchase_invoice_status_1.rollupPurchaseInvoiceStatus)(new client_1.Prisma.Decimal('5900'), new client_1.Prisma.Decimal('5900'));
        expect(status).toBe(client_1.PurchaseInvoiceStatus.PAID);
    });
    it('does not treat a zero-total invoice as PAID', () => {
        expect((0, purchase_invoice_status_1.rollupPurchaseInvoiceStatus)(0, 0)).toBe(client_1.PurchaseInvoiceStatus.UNPAID);
    });
});
//# sourceMappingURL=purchase-invoice-status.spec.js.map