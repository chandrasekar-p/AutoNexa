import { describe, expect, it } from 'vitest';
import { resolveDatePickerPreset } from './date-picker-presets';

const NOW = new Date(2026, 4, 23); // 23 May 2026 (local-time constructor, matches this session's established fix for timezone-flaky date-boundary tests)

describe('resolveDatePickerPreset', () => {
  it('today selects the exact current date', () => {
    expect(resolveDatePickerPreset('today', NOW)).toEqual({ date: '2026-05-23', year: 2026, month: 4 });
  });

  it('tomorrow selects the next calendar day', () => {
    expect(resolveDatePickerPreset('tomorrow', NOW)).toEqual({ date: '2026-05-24', year: 2026, month: 4 });
  });

  it('tomorrow rolls over into the next month correctly', () => {
    const endOfMonth = new Date(2026, 4, 31);
    expect(resolveDatePickerPreset('tomorrow', endOfMonth)).toEqual({ date: '2026-06-01', year: 2026, month: 5 });
  });

  it('thisWeek and thisMonth navigate to the current month with no selected date', () => {
    expect(resolveDatePickerPreset('thisWeek', NOW)).toEqual({ date: null, year: 2026, month: 4 });
    expect(resolveDatePickerPreset('thisMonth', NOW)).toEqual({ date: null, year: 2026, month: 4 });
  });

  it('nextWeek navigates to the month 7 days out', () => {
    expect(resolveDatePickerPreset('nextWeek', NOW)).toEqual({ date: null, year: 2026, month: 4 });
  });

  it('nextWeek can cross into the following month', () => {
    const nearMonthEnd = new Date(2026, 4, 28);
    expect(resolveDatePickerPreset('nextWeek', nearMonthEnd)).toEqual({ date: null, year: 2026, month: 5 });
  });

  it('nextMonth navigates to the following month', () => {
    expect(resolveDatePickerPreset('nextMonth', NOW)).toEqual({ date: null, year: 2026, month: 5 });
  });

  it('nextMonth rolls over into the next year from December', () => {
    const december = new Date(2026, 11, 15);
    expect(resolveDatePickerPreset('nextMonth', december)).toEqual({ date: null, year: 2027, month: 0 });
  });
});
