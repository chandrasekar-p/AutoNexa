'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { fillDailySales } from '@/lib/chart-data/fill-daily-sales';
import { formatMoney } from '@/lib/format';
import { CHART_COLORS } from '@/lib/chart-colors';
import type { PaginatedResult, SalesBucket } from '@/lib/api-types';

const DAYS = 30;

function last30Days(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (DAYS - 1));
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
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

/** 30-day daily sales trend — GET /reports/sales, zero-filled via fillDailySales so gap days don't distort the line's slope. */
export function SalesTrendChart() {
  const { from, to } = last30Days();
  const query = useApiQuery<PaginatedResult<SalesBucket>>(
    () => apiGet(`/reports/sales?groupBy=day&from=${from}&to=${to}&pageSize=100`),
    [from, to],
  );

  const points = query.data ? fillDailySales(query.data.items, from, to) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales — Last {DAYS} Days</CardTitle>
      </CardHeader>
      <CardBody>
        {query.isLoading ? <Skeleton className="h-56 w-full" /> : null}
        {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}
        {query.data ? (
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
              <YAxis hide domain={[0, (max: number) => (max > 0 ? max * 1.1 : 10)]} />
              <Tooltip content={TrendTooltip} cursor={{ stroke: 'var(--color-line)' }} />
              <Area
                type="monotone"
                dataKey="total"
                stroke={CHART_COLORS.accent}
                strokeWidth={2}
                fill="url(#salesTrendFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : null}
      </CardBody>
    </Card>
  );
}
