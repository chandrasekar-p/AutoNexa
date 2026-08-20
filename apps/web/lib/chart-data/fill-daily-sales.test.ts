import { describe, expect, it } from 'vitest';
import { fillDailySales } from './fill-daily-sales';

describe('fillDailySales', () => {
  it('fills every day in range with 0 when no buckets are given', () => {
    const points = fillDailySales([], '2026-08-01', '2026-08-03');
    expect(points.map((p) => p.date)).toEqual(['2026-08-01', '2026-08-02', '2026-08-03']);
    expect(points.every((p) => p.total === 0)).toBe(true);
  });

  it('places each bucket total on its matching day and zero-fills the rest', () => {
    const points = fillDailySales(
      [
        { period: '2026-08-01', total: '150.50' },
        { period: '2026-08-03', total: '75' },
      ],
      '2026-08-01',
      '2026-08-03',
    );
    expect(points).toEqual([
      { date: '2026-08-01', label: '1 Aug', total: 150.5 },
      { date: '2026-08-02', label: '2 Aug', total: 0 },
      { date: '2026-08-03', label: '3 Aug', total: 75 },
    ]);
  });

  it('is inclusive of both the from and to dates', () => {
    const points = fillDailySales([], '2026-08-05', '2026-08-05');
    expect(points).toHaveLength(1);
    expect(points[0]?.date).toBe('2026-08-05');
  });

  it('walks correctly across a month boundary', () => {
    const points = fillDailySales([], '2026-01-30', '2026-02-02');
    expect(points.map((p) => p.date)).toEqual(['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02']);
  });

  it('ignores a bucket outside the requested range rather than injecting an extra day', () => {
    const points = fillDailySales([{ period: '2026-08-10', total: '999' }], '2026-08-01', '2026-08-03');
    expect(points).toHaveLength(3);
    expect(points.every((p) => p.total === 0)).toBe(true);
  });
});
