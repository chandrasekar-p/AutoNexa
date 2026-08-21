'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { formatDate, formatMoney } from '@/lib/format';
import type { EstimateListItem, InspectionListItem, PaginatedResult, VehicleDetail } from '@/lib/api-types';
import { InspectionStatusBadge } from '@/components/domain/inspection-status-badge';
import { EstimateStatusBadge } from '@/components/domain/estimate-status-badge';
import { VehicleThumbnail } from '@/components/domain/vehicle-thumbnail';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

function VehiclePhotoUpload({ vehicle, canUpdate, onUpdated }: { vehicle: VehicleDetail; canUpdate: boolean; onUpdated: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploaded = await apiPost<{ url: string }>('/uploads', formData);
      await apiPatch(`/vehicles/${vehicle.id}`, { photoUrl: uploaded.url });
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload photo.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <VehicleThumbnail photoUrl={vehicle.photoUrl} alt={`${vehicle.brand} ${vehicle.model}`} className="h-16 w-16 rounded-xl" />
      {canUpdate ? (
        <>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={isUploading} className="text-xs font-medium text-accent-600 hover:underline dark:text-accent-400">
            {isUploading ? 'Uploading…' : vehicle.photoUrl ? 'Change Photo' : 'Upload Photo'}
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </>
      ) : null}
      {error ? <span className="text-xs text-danger-600 dark:text-danger-400">{error}</span> : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-micro font-semibold uppercase tracking-wide text-ink-secondary">{label}</span>
      <span className="text-sm text-ink">{value ?? '—'}</span>
    </div>
  );
}

const FUEL_LABEL: Record<string, string> = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  electric: 'Electric',
  hybrid: 'Hybrid',
  cng: 'CNG',
};

const TRANSMISSION_LABEL: Record<string, string> = { manual: 'Manual', automatic: 'Automatic' };

export default function VehicleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const canUpdate = usePermission('vehicle:update');
  const canDelete = usePermission('vehicle:delete');
  const canCreateAppointment = usePermission('appointment:create');
  const canCreateInspection = usePermission('inspection:create');
  const canReadInspections = usePermission('inspection:read');
  const canCreateEstimate = usePermission('estimate:create');
  const canReadEstimates = usePermission('estimate:read');
  const canCreateJobCard = usePermission('job-card:create');

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const query = useApiQuery<VehicleDetail>(() => apiGet(`/vehicles/${params.id}`), [params.id]);
  const inspections = useApiQuery<PaginatedResult<InspectionListItem>>(
    () =>
      canReadInspections
        ? apiGet(`/inspections?vehicleId=${params.id}&pageSize=10`)
        : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }),
    [params.id, canReadInspections],
  );
  const estimates = useApiQuery<PaginatedResult<EstimateListItem>>(
    () =>
      canReadEstimates
        ? apiGet(`/estimates?vehicleId=${params.id}&pageSize=10`)
        : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }),
    [params.id, canReadEstimates],
  );

  async function handleDelete() {
    if (!window.confirm('Delete this vehicle? This cannot be undone from here.')) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await apiDelete(`/vehicles/${params.id}`);
      router.push('/vehicles');
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setIsDeleting(false);
    }
  }

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (query.error) {
    return <ErrorState message={query.error} onRetry={query.refetch} />;
  }

  const vehicle = query.data;
  if (!vehicle) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <VehiclePhotoUpload vehicle={vehicle} canUpdate={canUpdate} onUpdated={query.refetch} />
          <div>
            <h1 className="num text-2xl font-semibold text-ink">{vehicle.registrationNo}</h1>
            <p className="text-sm text-ink-secondary">
              {vehicle.brand} {vehicle.model}
              {vehicle.variant ? ` ${vehicle.variant}` : ''}
              {vehicle.manufactureYear ? ` · ${vehicle.manufactureYear}` : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/vehicles" className="self-center text-sm text-ink-secondary hover:text-ink">
            &larr; Back to vehicles
          </Link>
          {canCreateAppointment ? (
            <Link href={`/appointments/new?customerId=${vehicle.customer.id}&vehicleId=${vehicle.id}`}>
              <Button variant="secondary">Book Appointment</Button>
            </Link>
          ) : null}
          {canCreateInspection ? (
            <Link href={`/inspections/new?vehicleId=${vehicle.id}`}>
              <Button variant="secondary">Start Inspection</Button>
            </Link>
          ) : null}
          {canCreateEstimate ? (
            <Link href={`/estimates/new?vehicleId=${vehicle.id}`}>
              <Button variant="secondary">New Estimate</Button>
            </Link>
          ) : null}
          {canCreateJobCard ? (
            <Link href={`/job-cards/new?customerId=${vehicle.customer.id}&vehicleId=${vehicle.id}`}>
              <Button variant="secondary">New Job Card</Button>
            </Link>
          ) : null}
          {canUpdate ? (
            <Button variant="secondary" onClick={() => router.push(`/vehicles/${vehicle.id}/edit`)}>
              Edit
            </Button>
          ) : null}
          {canDelete ? (
            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      {deleteError ? <ErrorState message={deleteError} /> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Owner</CardTitle>
          </CardHeader>
          <CardBody>
            <Link
              href={`/customers/${vehicle.customer.id}`}
              className="flex flex-col gap-0.5 rounded-lg border border-line bg-surface-hover px-4 py-3 hover:border-accent-400"
            >
              <span className="text-sm font-medium text-ink">{vehicle.customer.name}</span>
              <span className="num text-xs text-ink-muted">{vehicle.customer.mobile}</span>
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehicle Details</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-4">
            <Field label="VIN / Chassis" value={vehicle.vin} />
            <Field label="Colour" value={vehicle.colour} />
            <Field label="Fuel Type" value={vehicle.fuelType ? (FUEL_LABEL[vehicle.fuelType] ?? null) : null} />
            <Field
              label="Transmission"
              value={vehicle.transmission ? (TRANSMISSION_LABEL[vehicle.transmission] ?? null) : null}
            />
            <Field label="Odometer" value={vehicle.odometerReading !== null ? `${vehicle.odometerReading} km` : null} />
            <Field label="Purchase Date" value={vehicle.purchaseDate ? formatDate(vehicle.purchaseDate) : null} />
            <Field label="Insurance Expiry" value={vehicle.insuranceExpiry ? formatDate(vehicle.insuranceExpiry) : null} />
            <Field label="PUC Expiry" value={vehicle.pucExpiry ? formatDate(vehicle.pucExpiry) : null} />
            <div className="col-span-2">
              <Field label="Warranty Info" value={vehicle.warrantyInfo} />
            </div>
            {vehicle.notes ? (
              <div className="col-span-2">
                <Field label="Notes" value={vehicle.notes} />
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>

      {canReadInspections ? (
        <Card>
          <CardHeader>
            <CardTitle>Inspections {inspections.data ? `(${inspections.data.total})` : ''}</CardTitle>
          </CardHeader>
          <CardBody>
            {inspections.isLoading ? <Skeleton className="h-10 w-full" /> : null}
            {inspections.error ? <ErrorState message={inspections.error} onRetry={inspections.refetch} /> : null}
            {inspections.data && inspections.data.items.length === 0 ? (
              <p className="text-sm text-ink-muted">No inspections on file yet.</p>
            ) : null}
            {inspections.data && inspections.data.items.length > 0 ? (
              <ul className="flex flex-col divide-y divide-line">
                {inspections.data.items.map((inspection) => (
                  <li key={inspection.id} className="flex items-center justify-between py-2.5 text-sm">
                    <Link href={`/inspections/${inspection.id}`} className="text-ink hover:text-accent-600">
                      {formatDate(inspection.createdAt)}
                    </Link>
                    <InspectionStatusBadge status={inspection.status} />
                  </li>
                ))}
              </ul>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {canReadEstimates ? (
        <Card>
          <CardHeader>
            <CardTitle>Estimates {estimates.data ? `(${estimates.data.total})` : ''}</CardTitle>
          </CardHeader>
          <CardBody>
            {estimates.isLoading ? <Skeleton className="h-10 w-full" /> : null}
            {estimates.error ? <ErrorState message={estimates.error} onRetry={estimates.refetch} /> : null}
            {estimates.data && estimates.data.items.length === 0 ? (
              <p className="text-sm text-ink-muted">No estimates on file yet.</p>
            ) : null}
            {estimates.data && estimates.data.items.length > 0 ? (
              <ul className="flex flex-col divide-y divide-line">
                {estimates.data.items.map((estimate) => (
                  <li key={estimate.id} className="flex items-center justify-between py-2.5 text-sm">
                    <Link href={`/estimates/${estimate.id}`} className="text-ink hover:text-accent-600">
                      {estimate.jobDescription ?? formatDate(estimate.createdAt)}
                    </Link>
                    <span className="flex items-center gap-2">
                      <span className="num text-ink-secondary">{formatMoney(estimate.total)}</span>
                      <EstimateStatusBadge status={estimate.status} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Documents ({vehicle.documents.length})</CardTitle>
        </CardHeader>
        <CardBody>
          {vehicle.documents.length === 0 ? (
            <p className="text-sm text-ink-muted">No documents uploaded yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {vehicle.documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between py-2.5 text-sm">
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-ink hover:text-accent-600">
                    {doc.fileName ?? doc.docType}
                  </a>
                  <span className="text-xs text-ink-muted">
                    {doc.docType} · {formatDate(doc.uploadedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
