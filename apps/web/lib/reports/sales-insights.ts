import type { SalesSummary } from '@/lib/api-types';

/** Shared by report-sales-kpi-row.tsx for the KPI card deltas — null (not a fake %) when the previous baseline is zero. */
export function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

/** "2026-08-22" -> "22 Aug", "2026-08" -> "Aug 2026" — UTC-based, same discipline as fill-daily-sales.ts's `label`. Also used by report-sales-kpi-row.tsx and report-sales-chart.tsx for period labels. */
export function formatPeriodLabel(period: string): string {
  const isMonth = period.length === 7;
  const date = new Date(`${period}${isMonth ? '-01' : ''}T00:00:00.000Z`);
  return date.toLocaleDateString('en-IN', isMonth ? { month: 'short', year: 'numeric', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/**
 * Up to 3 short insight strings computed entirely from an already-fetched
 * GET /reports/sales-summary response — no fabricated numbers, nothing
 * this function doesn't already have on hand. Returns `[]` whenever there
 * isn't enough data to say anything meaningful (empty period, or a zero
 * previous-period baseline for every comparable metric), so the caller can
 * render the required "Not enough data to generate insights." fallback.
 */
export function generateSalesInsights(summary: SalesSummary): string[] {
  if (summary.buckets.length === 0) return [];

  const insights: string[] = [];

  const salesPct = pctChange(Number(summary.kpis.totalSales), Number(summary.previousKpis.totalSales));
  if (salesPct !== null) {
    const direction = salesPct >= 0 ? 'increased' : 'decreased';
    insights.push(`${salesPct >= 0 ? '↑' : '↓'} Sales ${direction} by ${Math.abs(salesPct).toFixed(1)}% in the selected period.`);
  }

  if (summary.kpis.highestDay) {
    insights.push(`★ ${formatPeriodLabel(summary.kpis.highestDay.period)} recorded the highest sales.`);
  }

  const avgPct = pctChange(Number(summary.kpis.averageInvoiceValue), Number(summary.previousKpis.averageInvoiceValue));
  if (avgPct !== null) {
    const direction = avgPct >= 0 ? 'increased' : 'decreased';
    insights.push(`${avgPct >= 0 ? '↑' : '↓'} Average invoice value ${direction} by ${Math.abs(avgPct).toFixed(1)}%.`);
  }

  return insights.slice(0, 3);
}
