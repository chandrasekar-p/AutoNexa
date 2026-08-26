'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Car, Trash2, User } from 'lucide-react';
import { apiDelete, apiGet, apiPatch, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { formatDate, formatDurationMinutes, formatTime } from '@/lib/format';
import type { InspectionDetail, InspectionStatus, VehicleDetail } from '@/lib/api-types';
import { InspectionStatusBadge } from '@/components/domain/inspection-status-badge';
import { InspectionChecklist } from '@/components/domain/inspection-checklist';
import { InspectionPhotos } from '@/components/domain/inspection-photos';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

export default function InspectionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const canUpdate = usePermission('inspection:update');
  const canDelete = usePermission('inspection:delete');
  const canCreateEstimate = usePermission('estimate:create');

  const [status, setStatus] = useState<InspectionStatus>('IN_PROGRESS');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const query = useApiQuery<InspectionDetail>(() => apiGet(`/inspections/${params.id}`), [params.id]);
  const vehicle = useApiQuery<VehicleDetail>(
    () => (query.data ? apiGet(`/vehicles/${query.data.vehicleId}`) : Promise.reject(new Error('n/a'))),
    [query.data?.vehicleId],
  );

  // Local editable copies re-sync whenever a fresh fetch lands (initial
  // load, or after Save Changes) — but not on every render, or typing in
  // Notes would get overwritten by the still-stale in-flight query state.
  useEffect(() => {
    if (query.data) {
      setStatus(query.data.status);
      setNotes(query.data.notes ?? '');
    }
  }, [query.data?.id, query.data?.status, query.data?.notes]);

  async function handleSave() {
    setIsSaving(true);
    setActionError(null);
    try {
      await apiPatch(`/inspections/${params.id}`, { status, notes: notes || null });
      await query.refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this inspection? This cannot be undone.')) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await apiDelete(`/inspections/${params.id}`);
      router.push('/inspections');
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setIsDeleting(false);
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

  // No longer locked once COMPLETED — permission is the only gate, so a
  // completed inspection's checklist/notes/result can still be corrected
  // afterward (e.g. fixing a typo caught during review).
  const readOnly = !canUpdate;
  const isDirty = status !== inspection.status || notes !== (inspection.notes ?? '');

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-1.5 text-xs text-ink-muted">
        <Link href="/inspections" className="hover:text-ink">
          Inspections
        </Link>
        <span>/</span>
        <span className="text-ink-secondary">Edit Inspection</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-ink">Edit Inspection</h1>
            <InspectionStatusBadge status={inspection.status} />
          </div>
          <p className="text-sm text-ink-secondary">Update inspection details and checklist results.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/inspections">
            <Button type="button" variant="secondary" size="sm">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Back to Inspections
            </Button>
          </Link>
          {canCreateEstimate ? (
            <Link href={`/estimates/new?vehicleId=${inspection.vehicleId}`}>
              <Button type="button" variant="secondary" size="sm">
                Create Estimate
              </Button>
            </Link>
          ) : null}
          {canDelete ? (
            <Button type="button" variant="danger" size="sm" onClick={handleDelete} isLoading={isDeleting}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      {actionError ? <ErrorState message={actionError} /> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 shadow-card">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-400">
            <Car className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-micro font-semibold uppercase tracking-wide text-ink-muted">Vehicle</p>
            {vehicle.data ? (
              <Link href={`/vehicles/${vehicle.data.id}`} className="block truncate text-sm font-medium text-ink hover:text-accent-600">
                <span className="num">{vehicle.data.registrationNo}</span>
                <span className="block text-xs font-normal text-ink-muted">
                  {vehicle.data.brand} {vehicle.data.model}
                </span>
              </Link>
            ) : (
              <Skeleton className="h-4 w-24" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 shadow-card">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <User className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-micro font-semibold uppercase tracking-wide text-ink-muted">Customer</p>
            {vehicle.data ? (
              <>
                <p className="truncate text-sm font-medium text-ink">{vehicle.data.customer.name}</p>
                <p className="num text-xs text-ink-muted">{vehicle.data.customer.mobile}</p>
              </>
            ) : (
              <Skeleton className="h-4 w-24" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 shadow-card">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400">
            <Calendar className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-micro font-semibold uppercase tracking-wide text-ink-muted">Inspection Started</p>
            <p className="truncate text-sm font-medium text-ink">
              {formatDate(inspection.createdAt)} · {formatTime(inspection.createdAt)}
            </p>
            <p className="text-xs text-ink-muted">Duration: {formatDurationMinutes(inspection.durationMinutes)}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inspection Notes</CardTitle>
        </CardHeader>
        <CardBody>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Overall notes about this inspection…"
            disabled={readOnly}
            rows={3}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checklist</CardTitle>
        </CardHeader>
        <CardBody>
          <InspectionChecklist inspectionId={inspection.id} items={inspection.items} readOnly={readOnly} onUpdated={query.refetch} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photos</CardTitle>
        </CardHeader>
        <CardBody>
          <InspectionPhotos inspectionId={inspection.id} photos={inspection.photos} readOnly={readOnly} onUploaded={query.refetch} />
        </CardBody>
      </Card>

      {!readOnly ? (
        <Card>
          <CardBody className="flex flex-wrap items-end justify-between gap-4 pt-5">
            <div className="w-56">
              <Select label="Overall Result" value={status} onChange={(e) => setStatus(e.target.value as InspectionStatus)}>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => router.push('/inspections')} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} isLoading={isSaving} disabled={!isDirty}>
                Save Changes
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
