"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const profit_margin_1 = require("../src/modules/reports/profit-margin");
describe('calculatePartMargin', () => {
    it('computes (sellingPrice - purchasePrice) x quantity', () => {
        const margin = (0, profit_margin_1.calculatePartMargin)({ quantity: 3, sellingPrice: 1200, purchasePrice: 800 });
        expect(margin.toString()).toBe('1200');
    });
    it('is negative when sold below purchase price', () => {
        const margin = (0, profit_margin_1.calculatePartMargin)({ quantity: 1, sellingPrice: 100, purchasePrice: 150 });
        expect(margin.toString()).toBe('-50');
    });
    it('is zero when sold at exactly purchase price', () => {
        const margin = (0, profit_margin_1.calculatePartMargin)({ quantity: 5, sellingPrice: 100, purchasePrice: 100 });
        expect(margin.toString()).toBe('0');
    });
});
describe('calculateTotalMargin', () => {
    it('adds parts margin and labour revenue (labour counted at 100% margin)', () => {
        const total = (0, profit_margin_1.calculateTotalMargin)(1200, 800);
        expect(total.toString()).toBe('2000');
    });
    it('handles a negative parts margin correctly', () => {
        const total = (0, profit_margin_1.calculateTotalMargin)(-50, 800);
        expect(total.toString()).toBe('750');
    });
});
//# sourceMappingURL=profit-margin.spec.js.map