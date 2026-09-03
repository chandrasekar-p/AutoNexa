import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { JobCardStatusBadge } from '@/components/domain/job-card-status-badge';
import { formatDate, daysUntil, formatQuantity } from '@/lib/format';
import type { NotificationAlerts } from '@/lib/api-types';

interface Props {
  alerts: NotificationAlerts | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function DashboardAlertsCard({ alerts, isLoading, error, onRetry }: Props) {
  const totalAlerts = alerts
    ? alerts.lowStockParts.length + alerts.expiringDocuments.length + alerts.delayedJobCards.length
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alerts</CardTitle>
        {alerts ? <Badge tone={totalAlerts > 0 ? 'warning' : 'neutral'}>{totalAlerts}</Badge> : null}
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : null}
        {error ? <ErrorState message={error} onRetry={onRetry} /> : null}
        {alerts && totalAlerts === 0 ? (
          <p className="text-sm text-ink-muted">Nothing needs attention right now.</p>
        ) : null}
        {alerts && totalAlerts > 0 ? (
          <ul className="flex flex-col divide-y divide-line">
            {alerts.lowStockParts.map((part) => (
              <li key={`part-${part.id}`} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm text-ink">
                  {part.name} <span className="text-ink-muted">({part.partNumber})</span>
                </span>
                <span className="num shrink-0 text-xs font-medium text-warning-600 dark:text-warning-400">
                  {formatQuantity(part.currentStock, part.unit)} / {formatQuantity(part.minStock, part.unit)} left
                </span>
              </li>
            ))}
            {alerts.expiringDocuments.map((doc) => (
              <li key={`doc-${doc.vehicleId}`} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm text-ink">
                  {doc.registrationNo}
                  {doc.customer ? <span className="text-ink-muted"> — {doc.customer.name}</span> : null}
                </span>
                <span className="shrink-0 text-xs font-medium text-warning-600 dark:text-warning-400">
                  {doc.insuranceExpiry ? `Insurance ${formatDate(doc.insuranceExpiry)}` : null}
                  {doc.insuranceExpiry && doc.pucExpiry ? ' · ' : null}
                  {doc.pucExpiry ? `PUC ${formatDate(doc.pucExpiry)}` : null}
                </span>
              </li>
            ))}
            {alerts.delayedJobCards.map((jc) => (
              <li key={`jc-${jc.jobCardId}`} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm text-ink">
                  {jc.jobCardNumber}
                  {jc.vehicle ? <span className="text-ink-muted"> — {jc.vehicle.registrationNo}</span> : null}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {jc.expectedDelivery ? (
                    <span className="text-xs font-medium text-danger-600 dark:text-danger-400">
                      {Math.abs(daysUntil(jc.expectedDelivery))}d overdue
                    </span>
                  ) : null}
                  <JobCardStatusBadge status={jc.status} />
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </CardBody>
    </Card>
  );
}
