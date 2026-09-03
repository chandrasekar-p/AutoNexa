"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const part_stock_adjustment_1 = require("../src/modules/parts/part-stock-adjustment");
function decimalString(value) {
    return value.toString();
}
describe('mapAdjustmentReasonToTxnType', () => {
    it('maps DAMAGED and RETURNED to their own dedicated enum values', () => {
        expect((0, part_stock_adjustment_1.mapAdjustmentReasonToTxnType)('DAMAGED')).toBe('DAMAGED');
        expect((0, part_stock_adjustment_1.mapAdjustmentReasonToTxnType)('RETURNED')).toBe('RETURN');
    });
    it('maps every other reason to ADJUSTMENT — PURCHASE_IN/JOB_CARD_CONSUMPTION stay reserved for the real automated flows', () => {
        expect((0, part_stock_adjustment_1.mapAdjustmentReasonToTxnType)('PURCHASE_RECEIVED')).toBe('ADJUSTMENT');
        expect((0, part_stock_adjustment_1.mapAdjustmentReasonToTxnType)('PART_USED')).toBe('ADJUSTMENT');
        expect((0, part_stock_adjustment_1.mapAdjustmentReasonToTxnType)('MANUAL_CORRECTION')).toBe('ADJUSTMENT');
        expect((0, part_stock_adjustment_1.mapAdjustmentReasonToTxnType)('WARRANTY_REPLACEMENT')).toBe('ADJUSTMENT');
        expect((0, part_stock_adjustment_1.mapAdjustmentReasonToTxnType)('OTHER')).toBe('ADJUSTMENT');
    });
});
describe('computeAdjustmentDelta', () => {
    it('is positive for Stock In', () => {
        expect(decimalString((0, part_stock_adjustment_1.computeAdjustmentDelta)('IN', 10))).toBe('10');
    });
    it('is negative for Stock Out', () => {
        expect(decimalString((0, part_stock_adjustment_1.computeAdjustmentDelta)('OUT', 10))).toBe('-10');
    });
    it('is positive and precise for a fractional Stock In', () => {
        expect(decimalString((0, part_stock_adjustment_1.computeAdjustmentDelta)('IN', '2.750'))).toBe('2.75');
    });
    it('is negative and precise for a fractional Stock Out', () => {
        expect(decimalString((0, part_stock_adjustment_1.computeAdjustmentDelta)('OUT', '2.750'))).toBe('-2.75');
    });
});
describe('formatAdjustmentNotes', () => {
    it('is just the reason label when no notes given', () => {
        expect((0, part_stock_adjustment_1.formatAdjustmentNotes)('MANUAL_CORRECTION')).toBe('Manual Correction');
    });
    it('appends free-text notes after the reason label', () => {
        expect((0, part_stock_adjustment_1.formatAdjustmentNotes)('DAMAGED', 'Cracked in transit')).toBe('Damaged — Cracked in transit');
    });
});
//# sourceMappingURL=part-stock-adjustment.spec.js.map