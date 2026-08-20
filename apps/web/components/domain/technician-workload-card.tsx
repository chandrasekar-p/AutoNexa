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
          <ul className="flex flex-col divide-y divide-line">
            {workload.map((t) => (
              <li key={t.technicianId} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-ink">{t.name}</span>
                <span className="num text-sm font-semibold text-ink">
                  {t.jobsOpen} <span className="font-normal text-ink-muted">open</span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </CardBody>
    </Card>
  );
}
