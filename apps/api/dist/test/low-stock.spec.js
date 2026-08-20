"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const low_stock_1 = require("../src/modules/parts/low-stock");
describe('isLowStock', () => {
    it('is true when currentStock is below minStock', () => {
        expect((0, low_stock_1.isLowStock)({ currentStock: 2, minStock: 5 })).toBe(true);
    });
    it('is true when currentStock exactly equals minStock', () => {
        expect((0, low_stock_1.isLowStock)({ currentStock: 5, minStock: 5 })).toBe(true);
    });
    it('is false when currentStock is above minStock', () => {
        expect((0, low_stock_1.isLowStock)({ currentStock: 6, minStock: 5 })).toBe(false);
    });
    it('is true for zero stock against a positive minStock', () => {
        expect((0, low_stock_1.isLowStock)({ currentStock: 0, minStock: 1 })).toBe(true);
    });
    it('is true for zero stock even when minStock is also zero — <= includes equality', () => {
        expect((0, low_stock_1.isLowStock)({ currentStock: 0, minStock: 0 })).toBe(true);
    });
});
//# sourceMappingURL=low-stock.spec.js.map