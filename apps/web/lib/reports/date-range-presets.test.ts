import { describe, expect, it } from 'vitest';
import { resolveDateRangePreset } from './date-range-presets';

const NOW = new Date('2026-08-22T14:30:00.000Z');

describe('resolveDateRangePreset', () => {
  it('today: from and to are both the current date', () => {
    expect(resolveDateRangePreset('today', NOW)).toEqual({ from: '2026-08-22', to: '2026-08-22' });
  });

  it('yesterday: both bounds are the day before', () => {
    expect(resolveDateRangePreset('yesterday', NOW)).toEqual({ from: '2026-08-21', to: '2026-08-21' });
  });

  it('last7: 7-day inclusive window ending today', () => {
    expect(resolveDateRangePreset('last7', NOW)).toEqual({ from: '2026-08-16', to: '2026-08-22' });
  });

  it('last30: 30-day inclusive window ending today', () => {
    expect(resolveDateRangePreset('last30', NOW)).toEqual({ from: '2026-07-24', to: '2026-08-22' });
  });

  it('thisMonth: 1st of the current month through today', () => {
    expect(resolveDateRangePreset('thisMonth', NOW)).toEqual({ from: '2026-08-01', to: '2026-08-22' });
  });

  it('lastMonth: the full previous calendar month', () => {
    expect(resolveDateRangePreset('lastMonth', NOW)).toEqual({ from: '2026-07-01', to: '2026-07-31' });
  });

  it('lastMonth correctly rolls back across a January boundary', () => {
    expect(resolveDateRangePreset('lastMonth', new Date('2026-01-15T00:00:00.000Z'))).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });

  it('custom: returns null so the caller keeps whatever the user typed', () => {
    expect(resolveDateRangePreset('custom', NOW)).toBeNull();
  });
});
