"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const loyalty_eligibility_1 = require("../src/modules/loyalty/loyalty-eligibility");
describe('hasSufficientPoints', () => {
    it('allows a redemption exactly equal to the balance', () => {
        expect((0, loyalty_eligibility_1.hasSufficientPoints)(100, 100)).toBe(true);
    });
    it('allows a redemption below the balance', () => {
        expect((0, loyalty_eligibility_1.hasSufficientPoints)(100, 50)).toBe(true);
    });
    it('rejects a redemption exceeding the balance', () => {
        expect((0, loyalty_eligibility_1.hasSufficientPoints)(100, 101)).toBe(false);
    });
    it('rejects a negative request', () => {
        expect((0, loyalty_eligibility_1.hasSufficientPoints)(100, -1)).toBe(false);
    });
    it('allows redeeming zero', () => {
        expect((0, loyalty_eligibility_1.hasSufficientPoints)(0, 0)).toBe(true);
    });
});
describe('computePointsEarned', () => {
    it('matches the invoice subtotal at the configured rate', () => {
        expect((0, loyalty_eligibility_1.computePointsEarned)(5000, 0.01)).toBe(50);
    });
    it('floors a fractional result rather than rounding up', () => {
        expect((0, loyalty_eligibility_1.computePointsEarned)(4999, 0.01)).toBe(49);
    });
    it('earns zero on a zero subtotal', () => {
        expect((0, loyalty_eligibility_1.computePointsEarned)(0, 0.01)).toBe(0);
    });
});
describe('computeRedemptionValue', () => {
    it('converts points to rupees at the configured rate', () => {
        expect((0, loyalty_eligibility_1.computeRedemptionValue)(50, 1).toNumber()).toBe(50);
        expect((0, loyalty_eligibility_1.computeRedemptionValue)(50, 0.5).toNumber()).toBe(25);
    });
});
//# sourceMappingURL=loyalty-eligibility.spec.js.map