"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const outstanding_1 = require("../src/common/billing/outstanding");
describe('computeInvoiceOutstanding', () => {
    it('returns the full grandTotal when nothing has been paid', () => {
        const outstanding = (0, outstanding_1.computeInvoiceOutstanding)({ grandTotal: 1712, payments: [] });
        expect(outstanding.toString()).toBe('1712');
    });
    it('subtracts the sum of payments from grandTotal', () => {
        const outstanding = (0, outstanding_1.computeInvoiceOutstanding)({
            grandTotal: 1712,
            payments: [{ amount: 712 }, { amount: 500 }],
        });
        expect(outstanding.toString()).toBe('500');
    });
    it('returns zero once payments meet grandTotal', () => {
        const outstanding = (0, outstanding_1.computeInvoiceOutstanding)({ grandTotal: 1712, payments: [{ amount: 1712 }] });
        expect(outstanding.toString()).toBe('0');
    });
});
describe('sumOutstanding', () => {
    it('sums only UNPAID/PARTIALLY_PAID invoices, ignoring PAID ones', () => {
        const total = (0, outstanding_1.sumOutstanding)([
            { status: client_1.InvoiceStatus.UNPAID, outstanding: 1000 },
            { status: client_1.InvoiceStatus.PARTIALLY_PAID, outstanding: 500 },
            { status: client_1.InvoiceStatus.PAID, outstanding: 0 },
        ]);
        expect(total.toString()).toBe('1500');
    });
    it('ignores REFUNDED invoices too', () => {
        const total = (0, outstanding_1.sumOutstanding)([
            { status: client_1.InvoiceStatus.REFUNDED, outstanding: 200 },
            { status: client_1.InvoiceStatus.UNPAID, outstanding: 300 },
        ]);
        expect(total.toString()).toBe('300');
    });
    it('returns zero for an empty list', () => {
        expect((0, outstanding_1.sumOutstanding)([]).toString()).toBe('0');
    });
});
//# sourceMappingURL=outstanding.spec.js.map