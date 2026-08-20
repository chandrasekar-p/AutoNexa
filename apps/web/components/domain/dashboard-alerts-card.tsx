import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { JobCardStatusBadge } from '@/components/domain/job-card-status-badge';
import { formatDate, daysUntil } from '@/lib/format';
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
          <p className="text-sm text-graphite-400">Nothing needs attention right now.</p>
        ) : null}
        {alerts && totalAlerts > 0 ? (
          <ul className="flex flex-col divide-y divide-graphite-100">
            {alerts.lowStockParts.map((part) => (
              <li key={`part-${part.id}`} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm text-graphite-800">
                  {part.name} <span className="text-graphite-400">({part.partNumber})</span>
                </span>
                <span className="num shrink-0 text-xs font-medium text-warning-600">
                  {part.currentStock} / {part.minStock} left
                </span>
              </li>
            ))}
            {alerts.expiringDocuments.map((doc) => (
              <li key={`doc-${doc.vehicleId}`} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm text-graphite-800">
                  {doc.registrationNo}
                  {doc.customer ? <span className="text-graphite-400"> — {doc.customer.name}</span> : null}
                </span>
                <span className="shrink-0 text-xs font-medium text-warning-600">
                  {doc.insuranceExpiry ? `Insurance ${formatDate(doc.insuranceExpiry)}` : null}
                  {doc.insuranceExpiry && doc.pucExpiry ? ' · ' : null}
                  {doc.pucExpiry ? `PUC ${formatDate(doc.pucExpiry)}` : null}
                </span>
              </li>
            ))}
            {alerts.delayedJobCards.map((jc) => (
              <li key={`jc-${jc.jobCardId}`} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm text-graphite-800">
                  {jc.jobCardNumber}
                  {jc.vehicle ? <span className="text-graphite-400"> — {jc.vehicle.registrationNo}</span> : null}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {jc.expectedDelivery ? (
                    <span className="text-xs font-medium text-danger-600">
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
