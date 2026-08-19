"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const payment_guard_1 = require("../src/modules/invoices/payment-guard");
describe('isOverpayment', () => {
    it('allows a payment that exactly settles the remaining balance', () => {
        expect((0, payment_guard_1.isOverpayment)(8000, 11800, 3800)).toBe(false);
    });
    it('allows a payment below the remaining balance', () => {
        expect((0, payment_guard_1.isOverpayment)(8000, 11800, 2000)).toBe(false);
    });
    it('rejects a payment that would exceed the grand total', () => {
        expect((0, payment_guard_1.isOverpayment)(8000, 11800, 4000)).toBe(true);
    });
    it('rejects any payment once the invoice is already fully paid', () => {
        expect((0, payment_guard_1.isOverpayment)(11800, 11800, 1)).toBe(true);
    });
    it('allows the first payment on a fresh invoice up to the full total', () => {
        expect((0, payment_guard_1.isOverpayment)(0, 11800, 11800)).toBe(false);
    });
});
//# sourceMappingURL=payment-guard.spec.js.map