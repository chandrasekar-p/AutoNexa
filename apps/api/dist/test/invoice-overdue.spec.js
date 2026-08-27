"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const invoice_overdue_1 = require("../src/modules/invoices/invoice-overdue");
const NOW = new Date(2026, 7, 27, 12, 0, 0);
describe('deriveInvoiceDisplayStatus', () => {
    it('is PAID regardless of how overdue the due date was', () => {
        expect((0, invoice_overdue_1.deriveInvoiceDisplayStatus)('PAID', new Date(2026, 6, 1), NOW)).toBe('PAID');
    });
    it('is REFUNDED regardless of due date', () => {
        expect((0, invoice_overdue_1.deriveInvoiceDisplayStatus)('REFUNDED', new Date(2026, 6, 1), NOW)).toBe('REFUNDED');
    });
    it('is OVERDUE when UNPAID and the due date has passed', () => {
        expect((0, invoice_overdue_1.deriveInvoiceDisplayStatus)('UNPAID', new Date(2026, 7, 26), NOW)).toBe('OVERDUE');
    });
    it('is OVERDUE when PARTIALLY_PAID and the due date has passed', () => {
        expect((0, invoice_overdue_1.deriveInvoiceDisplayStatus)('PARTIALLY_PAID', new Date(2026, 7, 20), NOW)).toBe('OVERDUE');
    });
    it('is not OVERDUE on the due date itself (still today, not yet passed)', () => {
        expect((0, invoice_overdue_1.deriveInvoiceDisplayStatus)('UNPAID', new Date(2026, 7, 27), NOW)).toBe('UNPAID');
    });
    it('stays UNPAID/PARTIALLY_PAID when the due date is in the future', () => {
        expect((0, invoice_overdue_1.deriveInvoiceDisplayStatus)('UNPAID', new Date(2026, 7, 30), NOW)).toBe('UNPAID');
        expect((0, invoice_overdue_1.deriveInvoiceDisplayStatus)('PARTIALLY_PAID', new Date(2026, 7, 30), NOW)).toBe('PARTIALLY_PAID');
    });
    it('is never OVERDUE when there is no due date at all', () => {
        expect((0, invoice_overdue_1.deriveInvoiceDisplayStatus)('UNPAID', null, NOW)).toBe('UNPAID');
    });
});
describe('computeOverdueDays', () => {
    it('counts whole calendar days past due', () => {
        expect((0, invoice_overdue_1.computeOverdueDays)(new Date(2026, 7, 24), NOW)).toBe(3);
    });
    it('is 0 on the due date itself', () => {
        expect((0, invoice_overdue_1.computeOverdueDays)(new Date(2026, 7, 27), NOW)).toBe(0);
    });
    it('never returns negative for a future due date', () => {
        expect((0, invoice_overdue_1.computeOverdueDays)(new Date(2026, 7, 30), NOW)).toBe(0);
    });
});
describe('invoiceDisplayStatusWhere', () => {
    it('OVERDUE matches UNPAID/PARTIALLY_PAID with a past due date', () => {
        const where = (0, invoice_overdue_1.invoiceDisplayStatusWhere)('OVERDUE', NOW);
        expect(where.status.in).toEqual(['UNPAID', 'PARTIALLY_PAID']);
        expect(where.dueDate.lt.getTime()).toBe(new Date(2026, 7, 27).getTime());
    });
    it('UNPAID excludes overdue ones via an OR on dueDate', () => {
        const where = (0, invoice_overdue_1.invoiceDisplayStatusWhere)('UNPAID', NOW);
        expect(where.status).toBe('UNPAID');
        expect(where.OR).toHaveLength(2);
    });
    it('PAID and REFUNDED are plain status filters, unaffected by due date', () => {
        expect((0, invoice_overdue_1.invoiceDisplayStatusWhere)('PAID', NOW)).toEqual({ status: 'PAID' });
        expect((0, invoice_overdue_1.invoiceDisplayStatusWhere)('REFUNDED', NOW)).toEqual({ status: 'REFUNDED' });
    });
});
//# sourceMappingURL=invoice-overdue.spec.js.map