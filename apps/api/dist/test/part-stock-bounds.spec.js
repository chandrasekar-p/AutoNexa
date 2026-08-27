"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const part_stock_bounds_1 = require("../src/modules/parts/part-stock-bounds");
describe('isValidStockBounds', () => {
    it('is valid when minStock is below maxStock', () => {
        expect((0, part_stock_bounds_1.isValidStockBounds)(5, 10)).toBe(true);
    });
    it('is valid when minStock equals maxStock', () => {
        expect((0, part_stock_bounds_1.isValidStockBounds)(10, 10)).toBe(true);
    });
    it('is invalid when minStock exceeds maxStock', () => {
        expect((0, part_stock_bounds_1.isValidStockBounds)(50, 10)).toBe(false);
    });
    it('is valid when there is no maxStock ceiling at all', () => {
        expect((0, part_stock_bounds_1.isValidStockBounds)(50, null)).toBe(true);
        expect((0, part_stock_bounds_1.isValidStockBounds)(50, undefined)).toBe(true);
    });
});
//# sourceMappingURL=part-stock-bounds.spec.js.map