import { computeServiceDue } from '../src/modules/messaging/next-service-due';

describe('computeServiceDue', () => {
  it('returns no due date when there is no service history', () => {
    const result = computeServiceDue(null, 45000, 6, 5000);
    expect(result.dueDate).toBeNull();
    expect(result.dueByOdometer).toBe(false);
  });

  it('computes a date-based due date from the last service + interval', () => {
    const result = computeServiceDue({ completedAt: new Date('2026-01-15T00:00:00.000Z'), odometer: 40000 }, null, 6, 5000);
    expect(result.dueDate?.toISOString()).toBe('2026-07-15T00:00:00.000Z');
  });

  it('flags dueByOdometer once the current reading crosses last-service + intervalKm', () => {
    const result = computeServiceDue({ completedAt: new Date('2026-01-15'), odometer: 40000 }, 45000, 6, 5000);
    expect(result.dueByOdometer).toBe(true);
  });

  it('does not flag dueByOdometer before the interval is crossed', () => {
    const result = computeServiceDue({ completedAt: new Date('2026-01-15'), odometer: 40000 }, 44000, 6, 5000);
    expect(result.dueByOdometer).toBe(false);
  });

  it('skips the odometer trigger when the current odometer reading is unknown', () => {
    const result = computeServiceDue({ completedAt: new Date('2026-01-15'), odometer: 40000 }, null, 6, 5000);
    expect(result.dueByOdometer).toBe(false);
    expect(result.dueDate).not.toBeNull();
  });

  it('skips the odometer trigger when the last service did not record one', () => {
    const result = computeServiceDue({ completedAt: new Date('2026-01-15'), odometer: null }, 99999, 6, 5000);
    expect(result.dueByOdometer).toBe(false);
  });

  it('can be due by both date and odometer at once', () => {
    const result = computeServiceDue({ completedAt: new Date('2025-01-01'), odometer: 10000 }, 20000, 6, 5000);
    expect(result.dueDate?.getTime()).toBeLessThan(Date.now());
    expect(result.dueByOdometer).toBe(true);
  });
});
