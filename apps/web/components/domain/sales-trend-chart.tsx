'use client';

import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import { Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { fillDailySales } from '@/lib/chart-data/fill-daily-sales';
import { formatMoney } from '@/lib/format';
import { exportRowsAsCsv } from '@/lib/export/csv';
import { CHART_COLORS } from '@/lib/chart-colors';
import { cn } from '@/lib/cn';
import type { PaginatedResult, SalesBucket } from '@/lib/api-types';

type PeriodKey = '7D' | '30D' | '3M' | '1Y';
const PERIODS: { key: PeriodKey; label: string; days: number; groupBy: 'day' | 'month' }[] = [
  { key: '7D', label: '7D', days: 7, groupBy: 'day' },
  { key: '30D', label: '30D', days: 30, groupBy: 'day' },
  { key: '3M', label: '3M', days: 90, groupBy: 'day' },
  { key: '1Y', label: '1Y', days: 365, groupBy: 'month' },
];

function rangeFor(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (days - 1));
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

// The equal-length window immediately preceding the current one — e.g. for
// a 30D view ending today, the 30 days before that — used only to compute
// the "+12.4% vs last 30 days" comparison, never rendered as its own chart.
function previousRangeFor(days: number): { from: string; to: string } {
  const currentFrom = new Date();
  currentFrom.setDate(currentFrom.getDate() - (days - 1));
  const to = new Date(currentFrom);
  to.setDate(to.getDate() - 1);
  const from = new Date(to);
  from.setDate(to.getDate() - (days - 1));
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

const PERIOD_COMPARE_LABEL: Record<PeriodKey, string> = {
  '7D': 'last 7 days',
  '30D': 'last 30 days',
  '3M': 'last 3 months',
  '1Y': 'last year',
};

function formatAxisTick(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(value % 100000 === 0 ? 0 : 1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K`;
  return `₹${value}`;
}

/** "2026-03" -> "Mar 2026" for the 1Y (monthly-bucket) view — GET /reports/sales?groupBy=month returns `period` as "YYYY-MM", not a full date fillDailySales could parse. */
function monthPoints(buckets: SalesBucket[]): { label: string; total: number }[] {
  return buckets
    .slice()
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((b) => {
      const [year, month] = b.period.split('-').map(Number);
      const label = new Date(Date.UTC(year!, (month ?? 1) - 1, 1)).toLocaleDateString('en-IN', {
        month: 'short',
        year: '2-digit',
        timeZone: 'UTC',
      });
      return { label, total: Number(b.total) };
    });
}

function TrendTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 shadow-card">
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className="num text-sm font-semibold text-ink">{formatMoney(Number(payload[0]?.value ?? 0))}</p>
    </div>
  );
}

interface Props {
  // This month's breakdown, not period-specific — reuses the dashboard
  // summary's existing MTD fields rather than making the sales report
  // support a labour/parts split for every arbitrary period too.
  monthlySales?: string;
  labourRevenueMonthly?: string;
  partsRevenueMonthly?: string;
}

/** Revenue trend with a period toggle — GET /reports/sales, zero-filled for day-grouped periods (see fill-daily-sales.ts) so gaps don't distort the line's slope; month-grouped (1Y) is sparse enough that gap-filling isn't needed. */
export function SalesTrendChart({ monthlySales, labourRevenueMonthly, partsRevenueMonthly }: Props) {
  const [period, setPeriod] = useState<PeriodKey>('30D');
  const config = PERIODS.find((p) => p.key === period)!;
  const { from, to } = rangeFor(config.days);

  const query = useApiQuery<PaginatedResult<SalesBucket>>(
    () => apiGet(`/reports/sales?groupBy=${config.groupBy}&from=${from}&to=${to}&pageSize=100`),
    [from, to, config.groupBy],
  );
  const prevRange = previousRangeFor(config.days);
  const prevQuery = useApiQuery<PaginatedResult<SalesBucket>>(
    () => apiGet(`/reports/sales?groupBy=${config.groupBy}&from=${prevRange.from}&to=${prevRange.to}&pageSize=100`),
    [prevRange.from, prevRange.to, config.groupBy],
  );

  const points = query.data
    ? config.groupBy === 'day'
      ? fillDailySales(query.data.items, from, to)
      : monthPoints(query.data.items)
    : [];
  const periodTotal = points.reduce((sum, p) => sum + p.total, 0);
  const prevTotal = prevQuery.data ? prevQuery.data.items.reduce((sum, b) => sum + Number(b.total), 0) : null;
  // null (not 0%) when the prior period had zero sales — same "don't divide
  // by zero into a meaningless percentage" rule as the daily KPI comparison
  // on the dashboard's DashboardService.summary.
  const changePct = prevTotal !== null && prevTotal > 0 ? ((periodTotal - prevTotal) / prevTotal) * 100 : null;

  return (
    <Card>
      <CardHeader className="items-start">
        <div>
          <CardTitle className="text-base normal-case tracking-normal text-ink">Revenue Overview</CardTitle>
          <p className="text-xs text-ink-secondary">Your business performance</p>
        </div>
        <div className="flex items-center gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={cn(
                'flex h-8 items-center rounded-md border px-3 text-xs font-semibold',
                p.key === period
                  ? 'border-accent-400 bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-400'
                  : 'border-line text-ink-secondary hover:bg-surface-hover',
              )}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => exportRowsAsCsv([{ key: 'label', label: 'Period' }, { key: 'total', label: 'Sales' }], points, `revenue-${period}.csv`)}
            aria-label="Export chart data as CSV"
            title="Export chart data as CSV"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line text-ink-secondary hover:bg-surface-hover"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </CardHeader>
      <CardBody>
        {query.isLoading ? <Skeleton className="h-56 w-full" /> : null}
        {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}
        {query.data ? (
          <>
            <p className="num text-3xl font-semibold text-ink">{formatMoney(periodTotal)}</p>
            {changePct !== null ? (
              <p className={changePct >= 0 ? 'mb-4 text-xs font-medium text-success-600 dark:text-success-400' : 'mb-4 text-xs font-medium text-danger-600 dark:text-danger-400'}>
                {changePct >= 0 ? '+' : ''}
                {changePct.toFixed(1)}% vs {PERIOD_COMPARE_LABEL[period]}
              </p>
            ) : (
              <div className="mb-4" />
            )}
            <ResponsiveContainer width="100%" height={224}>
              <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--color-line)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--color-line)' }}
                  interval={Math.max(0, Math.ceil(points.length / 6) - 1)}
                />
                <YAxis
                  domain={[0, (max: number) => (max > 0 ? max * 1.1 : 10)]}
                  tickFormatter={formatAxisTick}
                  tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip content={TrendTooltip} cursor={{ stroke: 'var(--color-line)' }} />
                <Area type="monotone" dataKey="total" stroke={CHART_COLORS.accent} strokeWidth={2} fill="url(#salesTrendFill)" />
              </AreaChart>
            </ResponsiveContainer>
            {monthlySales !== undefined ? (
              <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg border border-line p-3">
                <BreakdownStat label="Sales" value={formatMoney(monthlySales)} color={CHART_COLORS.accent} />
                <BreakdownStat label="Labour" value={formatMoney(labourRevenueMonthly ?? 0)} color="#7c3aed" />
                <BreakdownStat label="Parts" value={formatMoney(partsRevenueMonthly ?? 0)} color={CHART_COLORS.success} />
              </div>
            ) : null}
          </>
        ) : null}
      </CardBody>
    </Card>
  );
}

function BreakdownStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1.5 text-xs text-ink-secondary">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
        {label}
      </span>
      <span className="num text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}
