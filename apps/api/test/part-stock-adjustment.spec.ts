import {
  mapAdjustmentReasonToTxnType,
  computeAdjustmentDelta,
  formatAdjustmentNotes,
} from '../src/modules/parts/part-stock-adjustment';

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
    expect(computeAdjustmentDelta('IN', 10)).toBe(10);
  });

  it('is negative for Stock Out', () => {
    expect(computeAdjustmentDelta('OUT', 10)).toBe(-10);
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
