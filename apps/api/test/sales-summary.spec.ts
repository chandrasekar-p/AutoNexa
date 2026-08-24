import { computeSalesSummary, previousPeriodRange, SalesSummaryEntry } from '../src/modules/reports/sales-summary';

describe('previousPeriodRange', () => {
  it('returns the equal-length window immediately preceding the given range', () => {
    const range = previousPeriodRange(new Date('2026-08-19T00:00:00.000Z'), new Date('2026-08-22T23:59:59.999Z'));
    // Current range spans ~4 days (19-22 Aug) — previous should be the 4 days before it.
    expect(range.to.toISOString()).toBe('2026-08-18T23:59:59.999Z');
    expect(range.from.toISOString()).toBe('2026-08-15T00:00:00.000Z');
  });
});

describe('computeSalesSummary', () => {
  const entry = (date: string, amount: number, vehicleId: string | null): SalesSummaryEntry => ({
    date: new Date(date),
    amount,
    vehicleId,
  });

  it('buckets by day, sums totals, counts invoices, and dedupes cars serviced within a bucket', () => {
    const current = [
      entry('2026-08-19T09:00:00.000Z', 1000, 'v1'),
      entry('2026-08-19T15:00:00.000Z', 600, 'v1'), // same vehicle twice same day — bucket carsServiced still counts it once
      entry('2026-08-20T09:00:00.000Z', 2000, 'v2'),
    ];
    const summary = computeSalesSummary(current, [], 'day');

    expect(summary.buckets).toHaveLength(2);
    expect(summary.buckets[0]).toMatchObject({ period: '2026-08-19', invoiceCount: 2, carsServiced: 1 });
    expect(summary.buckets[1]).toMatchObject({ period: '2026-08-20', invoiceCount: 1, carsServiced: 1 });
    expect(summary.buckets[0]!.total.toString()).toBe('1600');
    expect(summary.buckets[0]!.averageInvoice.toString()).toBe('800');
  });

  it('computes carsServiced as a distinct count over the whole period, not summed per-bucket', () => {
    // Same vehicle serviced on two different days within the window.
    const current = [entry('2026-08-19T09:00:00.000Z', 1000, 'v1'), entry('2026-08-20T09:00:00.000Z', 1000, 'v1')];
    const summary = computeSalesSummary(current, [], 'day');

    expect(summary.buckets[0]!.carsServiced).toBe(1);
    expect(summary.buckets[1]!.carsServiced).toBe(1);
    // Whole-period KPI must be 1 (one distinct vehicle), not 2 (sum of per-bucket counts).
    expect(summary.kpis.carsServiced).toBe(1);
  });

  it('excludes null vehicleId (standalone service-package invoices) from carsServiced', () => {
    const current = [entry('2026-08-19T09:00:00.000Z', 500, null), entry('2026-08-19T10:00:00.000Z', 500, 'v1')];
    const summary = computeSalesSummary(current, [], 'day');

    expect(summary.kpis.totalInvoices).toBe(2);
    expect(summary.kpis.carsServiced).toBe(1);
  });

  it('identifies the highest-total day as highestDay', () => {
    const current = [
      entry('2026-08-19T09:00:00.000Z', 3600, 'v1'),
      entry('2026-08-20T09:00:00.000Z', 1416, 'v2'),
      entry('2026-08-22T09:00:00.000Z', 10460, 'v3'),
    ];
    const summary = computeSalesSummary(current, [], 'day');

    expect(summary.kpis.highestDay).toEqual({ period: '2026-08-22', total: expect.objectContaining({}) });
    expect(summary.kpis.highestDay!.total.toString()).toBe('10460');
  });

  it('returns highestDay: null and zeroed kpis for an empty period, never throwing', () => {
    const summary = computeSalesSummary([], [], 'day');

    expect(summary.buckets).toEqual([]);
    expect(summary.kpis.highestDay).toBeNull();
    expect(summary.kpis.totalSales.toString()).toBe('0');
    expect(summary.kpis.totalInvoices).toBe(0);
    expect(summary.kpis.carsServiced).toBe(0);
    expect(summary.kpis.averageInvoiceValue.toString()).toBe('0');
  });

  it('returns a full zeroed previousKpis (not null) when the previous period had no invoices', () => {
    const current = [entry('2026-08-19T09:00:00.000Z', 1000, 'v1')];
    const summary = computeSalesSummary(current, [], 'day');

    expect(summary.previousKpis).toEqual({
      totalSales: expect.objectContaining({}),
      totalInvoices: 0,
      carsServiced: 0,
      averageInvoiceValue: expect.objectContaining({}),
    });
    expect(summary.previousKpis.totalSales.toString()).toBe('0');
  });

  it('computes previousKpis from the previous entries independently of the current bucketing', () => {
    const current = [entry('2026-08-19T09:00:00.000Z', 1000, 'v1')];
    const previous = [entry('2026-08-15T09:00:00.000Z', 500, 'v1'), entry('2026-08-16T09:00:00.000Z', 500, 'v2')];
    const summary = computeSalesSummary(current, previous, 'day');

    expect(summary.previousKpis.totalSales.toString()).toBe('1000');
    expect(summary.previousKpis.totalInvoices).toBe(2);
    expect(summary.previousKpis.carsServiced).toBe(2);
    expect(summary.previousKpis.averageInvoiceValue.toString()).toBe('500');
  });

  it('buckets by month when groupBy is month', () => {
    const current = [entry('2026-08-19T09:00:00.000Z', 1000, 'v1'), entry('2026-08-25T09:00:00.000Z', 500, 'v2')];
    const summary = computeSalesSummary(current, [], 'month');

    expect(summary.buckets).toHaveLength(1);
    expect(summary.buckets[0]!.period).toBe('2026-08');
    expect(summary.buckets[0]!.total.toString()).toBe('1500');
  });
});
