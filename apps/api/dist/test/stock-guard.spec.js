"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stock_guard_1 = require("../src/modules/job-cards/stock-guard");
describe('hasSufficientStock', () => {
    it('allows a request exactly equal to current stock', () => {
        expect((0, stock_guard_1.hasSufficientStock)(5, 5)).toBe(true);
    });
    it('allows a request below current stock', () => {
        expect((0, stock_guard_1.hasSufficientStock)(5, 3)).toBe(true);
    });
    it('rejects a request exceeding current stock', () => {
        expect((0, stock_guard_1.hasSufficientStock)(5, 6)).toBe(false);
    });
    it('rejects any request against zero stock', () => {
        expect((0, stock_guard_1.hasSufficientStock)(0, 1)).toBe(false);
    });
});
//# sourceMappingURL=stock-guard.spec.js.map