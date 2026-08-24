import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { formatMoney } from '@/lib/format';
import { formatPeriodLabel } from '@/lib/reports/sales-insights';
import { CHART_COLORS } from '@/lib/chart-colors';
import type { SalesSummaryBucket } from '@/lib/api-types';

function formatAxisTick(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(value % 100000 === 0 ? 0 : 1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K`;
  return `₹${value}`;
}

interface ChartPoint {
  label: string;
  total: number;
  invoiceCount: number;
}

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as ChartPoint | undefined;
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 shadow-card">
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className="num text-sm font-semibold text-ink">{formatMoney(Number(payload[0]?.value ?? 0))}</p>
      {point ? <p className="text-xs text-ink-muted">{point.invoiceCount} invoice{point.invoiceCount === 1 ? '' : 's'}</p> : null}
    </div>
  );
}

/**
 * The Reports page's Sales Overview chart — bound to GET /reports/sales-summary's
 * `buckets`, so it always matches the KPI cards and detail table above/below it
 * (same response, same numbers). No period toggle of its own (unlike the
 * dashboard's SalesTrendChart) — the page's own date-range filter already
 * controls what window this renders.
 */
export function ReportSalesChart({ buckets }: { buckets: SalesSummaryBucket[] }) {
  const points: ChartPoint[] = buckets.map((b) => ({
    label: formatPeriodLabel(b.period),
    total: Number(b.total),
    invoiceCount: b.invoiceCount,
  }));

  return (
    <Card>
      <CardHeader className="items-start">
        <div>
          <CardTitle className="text-base normal-case tracking-normal text-ink">Sales Overview</CardTitle>
          <p className="text-xs text-ink-secondary">Revenue performance for the selected period</p>
        </div>
      </CardHeader>
      <CardBody>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="reportSalesFill" x1="0" y1="0" x2="0" y2="1">
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
              interval={Math.max(0, Math.ceil(points.length / 8) - 1)}
            />
            <YAxis
              domain={[0, (max: number) => (max > 0 ? max * 1.1 : 10)]}
              tickFormatter={formatAxisTick}
              tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip content={ChartTooltip} cursor={{ stroke: 'var(--color-line)' }} />
            <Area type="monotone" dataKey="total" stroke={CHART_COLORS.accent} strokeWidth={2} fill="url(#reportSalesFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}
