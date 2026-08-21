'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { CHART_COLORS } from '@/lib/chart-colors';
import type { JobCardStatus, JobCardStatusCount } from '@/lib/api-types';

// Coarse lifecycle buckets, not all 10 raw statuses — several already share
// one color under JobCardStatusBadge's own tone mapping (e.g. DIAGNOSIS and
// APPROVED are both "accent"), so a 10-slice donut would just show same-hue
// slices sitting next to each other. Fixed order/colors regardless of which
// buckets actually have job cards, so a slice's color never depends on what
// else is present this time (see the dataviz skill's "color follows the
// entity, never its rank").
const BUCKETS: { key: string; label: string; statuses: JobCardStatus[]; color: string }[] = [
  { key: 'open', label: 'Open', statuses: ['OPEN'], color: CHART_COLORS.neutral },
  {
    key: 'in_progress',
    label: 'In Progress',
    statuses: ['DIAGNOSIS', 'WAITING_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'WAITING_PARTS', 'QUALITY_CHECK'],
    color: CHART_COLORS.accent,
  },
  { key: 'ready', label: 'Ready / Delivered', statuses: ['READY_FOR_DELIVERY', 'DELIVERED'], color: CHART_COLORS.success },
  { key: 'cancelled', label: 'Cancelled', statuses: ['CANCELLED'], color: CHART_COLORS.danger },
];

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

/** All-time job card pipeline distribution — GET /reports/job-card-status, grouped into 4 lifecycle buckets and rendered as a donut with a center total, matching JobCardStatusBadge's tone colors. */
export function JobCardStatusChart() {
  const query = useApiQuery<JobCardStatusCount[]>(() => apiGet('/reports/job-card-status'), []);

  const countByStatus = new Map((query.data ?? []).map((row) => [row.status, row.count]));
  const data = BUCKETS.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    color: bucket.color,
    count: bucket.statuses.reduce((sum, status) => sum + (countByStatus.get(status) ?? 0), 0),
  })).filter((bucket) => bucket.count > 0);
  const total = data.reduce((sum, bucket) => sum + bucket.count, 0);

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
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
            <div className="relative h-52 w-52 shrink-0 [&_path:focus]:outline-none [&_path]:focus-visible:outline-none">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="count"
                    nameKey="label"
                    innerRadius="65%"
                    outerRadius="100%"
                    paddingAngle={2}
                    stroke="var(--color-surface)"
                    strokeWidth={2}
                  >
                    {data.map((bucket) => (
                      <Cell key={bucket.key} fill={bucket.color} />
                    ))}
                  </Pie>
                  <Tooltip content={StatusTooltip} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="num text-2xl font-semibold text-ink">{total}</span>
                <span className="text-micro font-semibold uppercase tracking-wide text-ink-muted">Total</span>
              </div>
            </div>
            <ul className="flex flex-col gap-2">
              {data.map((bucket) => (
                <li key={bucket.key} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: bucket.color }} aria-hidden />
                  <span className="text-ink-secondary">{bucket.label}</span>
                  <span className="num font-medium text-ink">{bucket.count}</span>
                  <span className="text-xs text-ink-muted">({Math.round((bucket.count / total) * 100)}%)</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
