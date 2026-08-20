import { todayDateOnly, dateOnly } from '../src/modules/attendance/date-only';

describe('dateOnly / todayDateOnly', () => {
  it('strips the time-of-day, keeping the calendar day at UTC midnight', () => {
    expect(dateOnly(new Date('2026-08-20T18:47:12.345Z')).toISOString()).toBe('2026-08-20T00:00:00.000Z');
  });

  it('rolls over correctly at a month/year boundary', () => {
    expect(dateOnly(new Date('2026-12-31T23:59:59.999Z')).toISOString()).toBe('2026-12-31T00:00:00.000Z');
    expect(dateOnly(new Date('2027-01-01T00:00:00.001Z')).toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  it('todayDateOnly defaults to the current date when no argument is passed', () => {
    const now = new Date();
    const expected = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    expect(todayDateOnly().toISOString()).toBe(expected.toISOString());
  });

  it('todayDateOnly uses the given date when one is passed', () => {
    expect(todayDateOnly(new Date('2026-08-20T05:00:00.000Z')).toISOString()).toBe('2026-08-20T00:00:00.000Z');
  });
});
