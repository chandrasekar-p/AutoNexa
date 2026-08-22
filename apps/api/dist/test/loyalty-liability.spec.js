"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const loyalty_liability_1 = require("../src/modules/loyalty/loyalty-liability");
describe('calculateLoyaltyLiability', () => {
    it('sums every customer\'s balance and converts at the redemption rate', () => {
        expect((0, loyalty_liability_1.calculateLoyaltyLiability)([100, 50, 200], 1).toNumber()).toBe(350);
    });
    it('applies a non-1 point value correctly', () => {
        expect((0, loyalty_liability_1.calculateLoyaltyLiability)([100, 100], 0.5).toNumber()).toBe(100);
    });
    it('is zero when no customer has a balance', () => {
        expect((0, loyalty_liability_1.calculateLoyaltyLiability)([], 1).toNumber()).toBe(0);
    });
});
//# sourceMappingURL=loyalty-liability.spec.js.map