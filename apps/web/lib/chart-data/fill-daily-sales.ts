import type { SalesBucket } from '@/lib/api-types';

export interface DailySalesPoint {
  date: string; // YYYY-MM-DD
  label: string; // short display label, e.g. "12 Aug"
  total: number;
}

/**
 * GET /reports/sales only returns a bucket for days that actually had an
 * invoice (see apps/api's sales-bucketing.ts) — filling the gaps with zero
 * here is what turns that into a proper continuous trend line instead of
 * one with wrong slopes jumping over silent days. Pure and DB-free, so
 * it's unit-testable without a fetch — same discipline as the backend's
 * own pure-decision-logic extractions.
 *
 * Dates are compared as UTC-midnight instants throughout (not the
 * browser's local timezone) so the day-by-day walk can't skip or repeat a
 * day depending on where the browser happens to be running.
 */
export function fillDailySales(buckets: SalesBucket[], fromISO: string, toISO: string): DailySalesPoint[] {
  const totals = new Map(buckets.map((b) => [b.period, Number(b.total)]));
  const points: DailySalesPoint[] = [];

  const cursor = new Date(`${fromISO}T00:00:00.000Z`);
  const end = new Date(`${toISO}T00:00:00.000Z`);

  while (cursor.getTime() <= end.getTime()) {
    const period = cursor.toISOString().slice(0, 10);
    points.push({
      date: period,
      label: cursor.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
      total: totals.get(period) ?? 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return points;
}
