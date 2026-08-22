"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discount_1 = require("../src/modules/invoices/discount");
const gst_split_1 = require("../src/modules/invoices/gst-split");
describe('applyProRataDiscount', () => {
    it('leaves line items untouched when there is no discount', () => {
        const lines = [{ lineTotal: 1000, gstRate: 18 }];
        expect((0, discount_1.applyProRataDiscount)(lines, 0)).toEqual(lines);
    });
    it('splits the discount proportionally across lines of different sizes', () => {
        const lines = [
            { lineTotal: 800, gstRate: 18 },
            { lineTotal: 200, gstRate: 28 },
        ];
        const result = (0, discount_1.applyProRataDiscount)(lines, 100);
        expect(result[0].lineTotal.toNumber()).toBe(720);
        expect(result[1].lineTotal.toNumber()).toBe(180);
    });
    it('the sum of prorated shares always equals the discount exactly, no rounding drift', () => {
        const lines = [
            { lineTotal: 333, gstRate: 18 },
            { lineTotal: 333, gstRate: 18 },
            { lineTotal: 334, gstRate: 18 },
        ];
        const result = (0, discount_1.applyProRataDiscount)(lines, 100);
        const totalAfter = result.reduce((sum, r) => sum + r.lineTotal.toNumber(), 0);
        const totalBefore = lines.reduce((sum, l) => sum + l.lineTotal, 0);
        expect(totalBefore - totalAfter).toBeCloseTo(100, 2);
    });
    it('is a no-op on an empty line item list', () => {
        expect((0, discount_1.applyProRataDiscount)([], 100)).toEqual([]);
    });
    it('reduces GST payable, proving the discount is applied pre-tax', () => {
        const lines = [{ lineTotal: 1000, gstRate: 18 }];
        const withoutDiscount = (0, gst_split_1.calculateGstSplit)(lines, 'Tamil Nadu', 'Tamil Nadu');
        const discounted = (0, discount_1.applyProRataDiscount)(lines, 200);
        const withDiscount = (0, gst_split_1.calculateGstSplit)(discounted, 'Tamil Nadu', 'Tamil Nadu');
        const totalGstBefore = withoutDiscount.cgstAmount.add(withoutDiscount.sgstAmount);
        const totalGstAfter = withDiscount.cgstAmount.add(withDiscount.sgstAmount);
        expect(totalGstBefore.toNumber()).toBe(180);
        expect(totalGstAfter.toNumber()).toBe(144);
    });
});
//# sourceMappingURL=discount.spec.js.map