import { describe, expect, it } from 'vitest';
import { getWorkshopHoursStatus } from './workshop-hours';

describe('getWorkshopHoursStatus', () => {
  it('returns null when either hour is unset', () => {
    expect(getWorkshopHoursStatus(null, '19:00')).toBeNull();
    expect(getWorkshopHoursStatus('09:00', undefined)).toBeNull();
    expect(getWorkshopHoursStatus(null, null)).toBeNull();
  });

  it('is open during business hours', () => {
    const now = new Date('2026-01-01T10:30:00');
    expect(getWorkshopHoursStatus('09:00', '19:00', now)?.isOpen).toBe(true);
  });

  it('is closed before opening', () => {
    const now = new Date('2026-01-01T07:00:00');
    expect(getWorkshopHoursStatus('09:00', '19:00', now)?.isOpen).toBe(false);
  });

  it('is closed after closing', () => {
    const now = new Date('2026-01-01T20:00:00');
    expect(getWorkshopHoursStatus('09:00', '19:00', now)?.isOpen).toBe(false);
  });

  it('handles overnight hours (open before midnight, close after)', () => {
    const lateNight = new Date('2026-01-01T23:30:00');
    const earlyMorning = new Date('2026-01-01T01:00:00');
    const midday = new Date('2026-01-01T12:00:00');
    expect(getWorkshopHoursStatus('18:00', '02:00', lateNight)?.isOpen).toBe(true);
    expect(getWorkshopHoursStatus('18:00', '02:00', earlyMorning)?.isOpen).toBe(true);
    expect(getWorkshopHoursStatus('18:00', '02:00', midday)?.isOpen).toBe(false);
  });

  it('formats the hours label in 12-hour clock', () => {
    const now = new Date('2026-01-01T10:30:00');
    expect(getWorkshopHoursStatus('09:00', '19:00', now)?.hoursLabel).toBe('09:00 AM – 07:00 PM');
  });
});
