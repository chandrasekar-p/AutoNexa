import { computeJobCardDelayStatus, computeJobCardDelayDays } from '../src/modules/job-cards/job-card-delay';

// Local-time Date constructors throughout (month is 0-indexed) — matching
// the function's own local-calendar-day comparison (same convention as
// DashboardService's todayRange()) and avoiding UTC-string/local-timezone
// boundary flakiness across different test-runner timezones.
const NOW = new Date(2026, 7, 26, 12, 0, 0);

describe('computeJobCardDelayStatus', () => {
  it('is null when there is no expectedDelivery', () => {
    expect(computeJobCardDelayStatus(null, 'IN_PROGRESS', NOW)).toBeNull();
  });

  it('is null once the job card is DELIVERED, even if it was overdue', () => {
    expect(computeJobCardDelayStatus(new Date(2026, 7, 20), 'DELIVERED', NOW)).toBeNull();
  });

  it('is null once CANCELLED', () => {
    expect(computeJobCardDelayStatus(new Date(2026, 7, 20), 'CANCELLED', NOW)).toBeNull();
  });

  it('is DELAYED when expectedDelivery is a past calendar day', () => {
    expect(computeJobCardDelayStatus(new Date(2026, 7, 25, 23, 0), 'IN_PROGRESS', NOW)).toBe('DELAYED');
  });

  it('is DUE_TODAY when expectedDelivery falls on the same calendar day', () => {
    expect(computeJobCardDelayStatus(new Date(2026, 7, 26, 23, 0), 'IN_PROGRESS', NOW)).toBe('DUE_TODAY');
  });

  it('is ON_TRACK when expectedDelivery is a future calendar day', () => {
    expect(computeJobCardDelayStatus(new Date(2026, 7, 28), 'IN_PROGRESS', NOW)).toBe('ON_TRACK');
  });
});

describe('computeJobCardDelayDays', () => {
  it('counts whole calendar days late', () => {
    expect(computeJobCardDelayDays(new Date(2026, 7, 24, 23, 0), NOW)).toBe(2);
  });

  it('never returns negative', () => {
    expect(computeJobCardDelayDays(new Date(2026, 7, 30), NOW)).toBe(0);
  });
});
