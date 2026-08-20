import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import type { DashboardSummary } from '@/lib/api-types';

interface Props {
  workload: DashboardSummary['technicianWorkload'] | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function TechnicianWorkloadCard({ workload, isLoading, error, onRetry }: Props) {
  const maxOpen = workload ? Math.max(1, ...workload.map((t) => t.jobsOpen)) : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Technician Workload</CardTitle>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : null}
        {error ? <ErrorState message={error} onRetry={onRetry} /> : null}
        {workload && workload.length === 0 ? (
          <p className="text-sm text-ink-muted">No technicians on file yet.</p>
        ) : null}
        {workload && workload.length > 0 ? (
          <ul className="flex flex-col gap-3.5">
            {workload.map((t) => (
              <li key={t.technicianId} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm text-ink">{t.name}</span>
                  <span className="num shrink-0 text-sm font-semibold text-ink">
                    {t.jobsOpen} <span className="font-normal text-ink-muted">open</span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-graphite-100 dark:bg-graphite-700/40">
                  <div
                    className="h-full rounded-full bg-accent-500 transition-[width]"
                    style={{ width: `${(t.jobsOpen / maxOpen) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </CardBody>
    </Card>
  );
}
