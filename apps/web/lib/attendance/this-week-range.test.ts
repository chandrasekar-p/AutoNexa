import { describe, expect, it } from 'vitest';
import { resolveThisWeekRange } from './this-week-range';

describe('resolveThisWeekRange', () => {
  it('resolves Monday-through-today for a mid-week date', () => {
    // 2026-08-26 is a Wednesday
    expect(resolveThisWeekRange(new Date('2026-08-26T14:30:00.000Z'))).toEqual({ from: '2026-08-24', to: '2026-08-26' });
  });

  it('resolves to just today when today is Monday', () => {
    // 2026-08-24 is a Monday
    expect(resolveThisWeekRange(new Date('2026-08-24T09:00:00.000Z'))).toEqual({ from: '2026-08-24', to: '2026-08-24' });
  });

  it('resolves back to the prior Monday when today is Sunday', () => {
    // 2026-08-30 is a Sunday
    expect(resolveThisWeekRange(new Date('2026-08-30T09:00:00.000Z'))).toEqual({ from: '2026-08-24', to: '2026-08-30' });
  });
});
