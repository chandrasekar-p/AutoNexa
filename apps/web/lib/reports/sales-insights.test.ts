import { describe, expect, it } from 'vitest';
import { generateSalesInsights } from './sales-insights';
import type { SalesSummary } from '@/lib/api-types';

function summary(overrides: Partial<SalesSummary> = {}): SalesSummary {
  return {
    buckets: [{ period: '2026-08-19', invoiceCount: 4, carsServiced: 3, total: '3600', averageInvoice: '900' }],
    kpis: { totalSales: '17600', totalInvoices: 18, carsServiced: 14, averageInvoiceValue: '1257', highestDay: { period: '2026-08-22', total: '10460' } },
    previousKpis: { totalSales: '13680', totalInvoices: 15, carsServiced: 12, averageInvoiceValue: '1328' },
    ...overrides,
  };
}

describe('generateSalesInsights', () => {
  it('returns [] when there are no buckets at all', () => {
    expect(generateSalesInsights(summary({ buckets: [] }))).toEqual([]);
  });

  it('reports an upward sales change vs the previous period', () => {
    const insights = generateSalesInsights(summary());
    expect(insights[0]).toMatch(/^↑ Sales increased by 28\.7% in the selected period\.$/);
  });

  it('reports a downward sales change vs the previous period', () => {
    const insights = generateSalesInsights(summary({ kpis: { ...summary().kpis, totalSales: '10000' } }));
    expect(insights[0]).toMatch(/^↓ Sales decreased by/);
  });

  it('names the highest-sales day using a short "D Mon" label', () => {
    const insights = generateSalesInsights(summary());
    expect(insights).toContain('★ 22 Aug recorded the highest sales.');
  });

  it('reports average invoice value direction', () => {
    const insights = generateSalesInsights(summary());
    // 1257 vs 1328 previous -> a decrease
    expect(insights.some((i) => i.startsWith('↓ Average invoice value decreased by'))).toBe(true);
  });

  it('omits a %-change line entirely when the previous baseline is zero, never dividing by zero', () => {
    const insights = generateSalesInsights(
      summary({ previousKpis: { totalSales: '0', totalInvoices: 0, carsServiced: 0, averageInvoiceValue: '0' } }),
    );
    expect(insights.some((i) => i.includes('Sales'))).toBe(false);
    expect(insights.some((i) => i.includes('Average invoice value'))).toBe(false);
    // highestDay-based insight is unaffected by the previous-period baseline.
    expect(insights).toContain('★ 22 Aug recorded the highest sales.');
  });

  it('omits the highest-day insight when there is no highestDay', () => {
    const insights = generateSalesInsights(summary({ kpis: { ...summary().kpis, highestDay: null } }));
    expect(insights.some((i) => i.startsWith('★'))).toBe(false);
  });

  it('returns at most 3 insights', () => {
    expect(generateSalesInsights(summary()).length).toBeLessThanOrEqual(3);
  });
});
