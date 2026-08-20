import { dailyReminderWindow } from '../src/modules/messaging/reminder-window';

describe('dailyReminderWindow', () => {
  it('returns [tomorrow 00:00 UTC, day-after 00:00 UTC) by default', () => {
    const now = new Date('2026-08-20T08:00:00.000Z');
    const { start, end } = dailyReminderWindow(now);
    expect(start.toISOString()).toBe('2026-08-21T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-08-22T00:00:00.000Z');
  });

  it('respects a custom leadDays', () => {
    const now = new Date('2026-08-20T08:00:00.000Z');
    const { start, end } = dailyReminderWindow(now, 2);
    expect(start.toISOString()).toBe('2026-08-22T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-08-23T00:00:00.000Z');
  });

  it('rolls over month/year boundaries correctly', () => {
    const now = new Date('2026-12-31T23:59:00.000Z');
    const { start, end } = dailyReminderWindow(now);
    expect(start.toISOString()).toBe('2027-01-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2027-01-02T00:00:00.000Z');
  });
});
