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
describe('derivePartStockStatus', () => {
    it('is out_of_stock at zero, even if minStock is also zero — a distinct bucket from low_stock, unlike isLowStock', () => {
        expect((0, low_stock_1.derivePartStockStatus)({ currentStock: 0, minStock: 0 })).toBe('out_of_stock');
        expect((0, low_stock_1.derivePartStockStatus)({ currentStock: 0, minStock: 5 })).toBe('out_of_stock');
    });
    it('is low_stock when positive but at or below minStock', () => {
        expect((0, low_stock_1.derivePartStockStatus)({ currentStock: 5, minStock: 5 })).toBe('low_stock');
        expect((0, low_stock_1.derivePartStockStatus)({ currentStock: 2, minStock: 5 })).toBe('low_stock');
    });
    it('is in_stock when above minStock', () => {
        expect((0, low_stock_1.derivePartStockStatus)({ currentStock: 6, minStock: 5 })).toBe('in_stock');
    });
});
//# sourceMappingURL=low-stock.spec.js.map