'use client';

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { CHART_COLORS } from '@/lib/chart-colors';
import { STATUS_LABEL, STATUS_TONE } from '@/components/domain/job-card-status-badge';
import type { JobCardStatusCount } from '@/lib/api-types';

function StatusTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as { label: string; count: number } | undefined;
  if (!point) return null;
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 shadow-card">
      <p className="text-xs text-ink-secondary">{point.label}</p>
      <p className="num text-sm font-semibold text-ink">{point.count}</p>
    </div>
  );
}

/** All-time job card pipeline distribution — GET /reports/job-card-status, bars colored to match JobCardStatusBadge's tones. */
export function JobCardStatusChart() {
  const query = useApiQuery<JobCardStatusCount[]>(() => apiGet('/reports/job-card-status'), []);

  const data = (query.data ?? []).map((row) => ({
    status: row.status,
    label: STATUS_LABEL[row.status],
    count: row.count,
    color: CHART_COLORS[STATUS_TONE[row.status]],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Card Pipeline</CardTitle>
      </CardHeader>
      <CardBody>
        {query.isLoading ? <Skeleton className="h-56 w-full" /> : null}
        {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}
        {query.data && data.length === 0 ? <p className="text-sm text-ink-muted">No job cards yet.</p> : null}
        {query.data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={224}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid horizontal={false} stroke="var(--color-line)" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--color-line)' }} />
              <YAxis
                type="category"
                dataKey="label"
                width={110}
                tick={{ fontSize: 11, fill: 'var(--color-ink-secondary)' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={StatusTooltip} cursor={{ fill: 'var(--color-surface-hover)' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {data.map((row) => (
                  <Cell key={row.status} fill={row.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </CardBody>
    </Card>
  );
}
