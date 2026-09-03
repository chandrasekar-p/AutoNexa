import {
  mapAdjustmentReasonToTxnType,
  computeAdjustmentDelta,
  formatAdjustmentNotes,
} from '../src/modules/parts/part-stock-adjustment';

function decimalString(value: { toString(): string }): string {
  return value.toString();
}

describe('mapAdjustmentReasonToTxnType', () => {
  it('maps DAMAGED and RETURNED to their own dedicated enum values', () => {
    expect(mapAdjustmentReasonToTxnType('DAMAGED')).toBe('DAMAGED');
    expect(mapAdjustmentReasonToTxnType('RETURNED')).toBe('RETURN');
  });

  it('maps every other reason to ADJUSTMENT — PURCHASE_IN/JOB_CARD_CONSUMPTION stay reserved for the real automated flows', () => {
    expect(mapAdjustmentReasonToTxnType('PURCHASE_RECEIVED')).toBe('ADJUSTMENT');
    expect(mapAdjustmentReasonToTxnType('PART_USED')).toBe('ADJUSTMENT');
    expect(mapAdjustmentReasonToTxnType('MANUAL_CORRECTION')).toBe('ADJUSTMENT');
    expect(mapAdjustmentReasonToTxnType('WARRANTY_REPLACEMENT')).toBe('ADJUSTMENT');
    expect(mapAdjustmentReasonToTxnType('OTHER')).toBe('ADJUSTMENT');
  });
});

describe('computeAdjustmentDelta', () => {
  it('is positive for Stock In', () => {
    expect(decimalString(computeAdjustmentDelta('IN', 10))).toBe('10');
  });

  it('is negative for Stock Out', () => {
    expect(decimalString(computeAdjustmentDelta('OUT', 10))).toBe('-10');
  });

  it('is positive and precise for a fractional Stock In', () => {
    expect(decimalString(computeAdjustmentDelta('IN', '2.750'))).toBe('2.75');
  });

  it('is negative and precise for a fractional Stock Out', () => {
    expect(decimalString(computeAdjustmentDelta('OUT', '2.750'))).toBe('-2.75');
  });
});

describe('formatAdjustmentNotes', () => {
  it('is just the reason label when no notes given', () => {
    expect(formatAdjustmentNotes('MANUAL_CORRECTION')).toBe('Manual Correction');
  });

  it('appends free-text notes after the reason label', () => {
    expect(formatAdjustmentNotes('DAMAGED', 'Cracked in transit')).toBe('Damaged — Cracked in transit');
  });
});
