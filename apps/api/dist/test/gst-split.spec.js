"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gst_split_1 = require("../src/modules/invoices/gst-split");
describe('calculateGstSplit', () => {
    it('splits GST as CGST+SGST for a same-state supply', () => {
        const result = (0, gst_split_1.calculateGstSplit)([{ lineTotal: 1000, gstRate: 18 }], 'Tamil Nadu', 'Tamil Nadu');
        expect(result.subtotal.toString()).toBe('1000');
        expect(result.cgstAmount.toString()).toBe('90');
        expect(result.sgstAmount.toString()).toBe('90');
        expect(result.igstAmount.toString()).toBe('0');
    });
    it('is case/whitespace-insensitive when comparing states', () => {
        const result = (0, gst_split_1.calculateGstSplit)([{ lineTotal: 1000, gstRate: 18 }], ' tamil nadu ', 'Tamil Nadu');
        expect(result.cgstAmount.toString()).toBe('90');
        expect(result.igstAmount.toString()).toBe('0');
    });
    it('charges the full GST as IGST for a different-state supply', () => {
        const result = (0, gst_split_1.calculateGstSplit)([{ lineTotal: 1000, gstRate: 18 }], 'Tamil Nadu', 'Karnataka');
        expect(result.subtotal.toString()).toBe('1000');
        expect(result.cgstAmount.toString()).toBe('0');
        expect(result.sgstAmount.toString()).toBe('0');
        expect(result.igstAmount.toString()).toBe('180');
    });
    it('falls back to CGST+SGST (same-state) when the tenant state is unset', () => {
        const result = (0, gst_split_1.calculateGstSplit)([{ lineTotal: 1000, gstRate: 18 }], null, 'Karnataka');
        expect(result.cgstAmount.toString()).toBe('90');
        expect(result.igstAmount.toString()).toBe('0');
    });
    it('falls back to CGST+SGST (same-state) when the customer state is unset', () => {
        const result = (0, gst_split_1.calculateGstSplit)([{ lineTotal: 1000, gstRate: 18 }], 'Tamil Nadu', undefined);
        expect(result.cgstAmount.toString()).toBe('90');
        expect(result.igstAmount.toString()).toBe('0');
    });
    it('falls back to CGST+SGST (same-state) when both states are unset', () => {
        const result = (0, gst_split_1.calculateGstSplit)([{ lineTotal: 1000, gstRate: 18 }], null, null);
        expect(result.cgstAmount.toString()).toBe('90');
        expect(result.igstAmount.toString()).toBe('0');
    });
    it('aggregates multiple lines with different GST rates', () => {
        const result = (0, gst_split_1.calculateGstSplit)([
            { lineTotal: 1000, gstRate: 18 },
            { lineTotal: 2000, gstRate: 28 },
        ], 'Tamil Nadu', 'Tamil Nadu');
        expect(result.subtotal.toString()).toBe('3000');
        expect(result.cgstAmount.toString()).toBe('370');
        expect(result.sgstAmount.toString()).toBe('370');
    });
});
describe('computeRoundOff', () => {
    it('rounds up a fractional total and reports a positive roundOff', () => {
        const result = (0, gst_split_1.computeRoundOff)(1180.4);
        expect(result.grandTotal.toString()).toBe('1180');
        expect(result.roundOff.toString()).toBe('-0.4');
    });
    it('rounds a half-rupee total up (half-up)', () => {
        const result = (0, gst_split_1.computeRoundOff)(1180.5);
        expect(result.grandTotal.toString()).toBe('1181');
        expect(result.roundOff.toString()).toBe('0.5');
    });
    it('reports zero roundOff for an already-whole total', () => {
        const result = (0, gst_split_1.computeRoundOff)(1180);
        expect(result.grandTotal.toString()).toBe('1180');
        expect(result.roundOff.toString()).toBe('0');
    });
});
//# sourceMappingURL=gst-split.spec.js.map