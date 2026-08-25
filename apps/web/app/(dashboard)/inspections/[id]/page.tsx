'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet, apiPatch, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { formatDate } from '@/lib/format';
import type { InspectionDetail, VehicleDetail } from '@/lib/api-types';
import { InspectionStatusBadge } from '@/components/domain/inspection-status-badge';
import { InspectionChecklist } from '@/components/domain/inspection-checklist';
import { InspectionPhotos } from '@/components/domain/inspection-photos';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

export default function InspectionDetailPage() {
  const params = useParams<{ id: string }>();
  const canUpdate = usePermission('inspection:update');
  const canCreateEstimate = usePermission('estimate:create');

  const [isCompleting, setIsCompleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const query = useApiQuery<InspectionDetail>(() => apiGet(`/inspections/${params.id}`), [params.id]);
  const vehicle = useApiQuery<VehicleDetail>(
    () => (query.data ? apiGet(`/vehicles/${query.data.vehicleId}`) : Promise.reject(new Error('n/a'))),
    [query.data?.vehicleId],
  );

  async function handleMarkCompleted() {
    setIsCompleting(true);
    setActionError(null);
    try {
      await apiPatch(`/inspections/${params.id}`, { status: 'COMPLETED' });
      query.refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  }

  // Only the true first load has no data yet — a background refetch (e.g.
  // after saving a checklist item) sets isLoading again too, and gating on
  // isLoading alone would unmount/remount the whole tree below on every
  // save, resetting InspectionChecklist's own active-tab state back to
  // Exterior every time. Once data has loaded once, a refetch just quietly
  // updates it in place instead.
  if (query.isLoading && !query.data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.error) {
    return <ErrorState message={query.error} onRetry={query.refetch} />;
  }

  const inspection = query.data;
  if (!inspection) return null;

  const readOnly = !canUpdate || inspection.status === 'COMPLETED';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-ink">Inspection</h1>
            <InspectionStatusBadge status={inspection.status} />
          </div>
          <p className="text-sm text-ink-secondary">Started {formatDate(inspection.createdAt)}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/inspections" className="self-center text-sm text-ink-secondary hover:text-ink">
            &larr; Back to inspections
          </Link>
          {canCreateEstimate ? (
            <Link href={`/estimates/new?vehicleId=${inspection.vehicleId}`}>
              <Button variant="secondary">Create Estimate</Button>
            </Link>
          ) : null}
          {canUpdate && inspection.status === 'IN_PROGRESS' ? (
            <Button onClick={handleMarkCompleted} isLoading={isCompleting}>
              Mark Completed
            </Button>
          ) : null}
        </div>
      </div>

      {actionError ? <ErrorState message={actionError} /> : null}

      {vehicle.data ? (
        <Link
          href={`/vehicles/${vehicle.data.id}`}
          className="flex w-fit flex-col gap-0.5 rounded-lg border border-line bg-surface px-4 py-3 shadow-card hover:border-accent-400"
        >
          <span className="num text-sm font-medium text-ink">{vehicle.data.registrationNo}</span>
          <span className="text-xs text-ink-muted">
            {vehicle.data.brand} {vehicle.data.model} · {vehicle.data.customer.name}
          </span>
        </Link>
      ) : null}

      {inspection.notes ? (
        <Card>
          <CardBody className="py-4">
            <p className="text-sm text-ink">{inspection.notes}</p>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Checklist</CardTitle>
        </CardHeader>
        <CardBody>
          <InspectionChecklist
            inspectionId={inspection.id}
            items={inspection.items}
            readOnly={readOnly}
            onUpdated={query.refetch}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photos</CardTitle>
        </CardHeader>
        <CardBody>
          <InspectionPhotos
            inspectionId={inspection.id}
            photos={inspection.photos}
            readOnly={readOnly}
            onUploaded={query.refetch}
          />
        </CardBody>
      </Card>
    </div>
  );
}
