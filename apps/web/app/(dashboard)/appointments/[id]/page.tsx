'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiDelete, apiGet, apiPatch, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { formatDate } from '@/lib/format';
import type { Appointment, AppointmentStatus } from '@/lib/api-types';
import { AppointmentStatusBadge } from '@/components/domain/appointment-status-badge';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-micro font-semibold uppercase tracking-wide text-ink-secondary">{label}</span>
      <span className="text-sm text-ink">{value ?? '—'}</span>
    </div>
  );
}

const NEXT_STATUS: Partial<Record<AppointmentStatus, AppointmentStatus>> = {
  SCHEDULED: 'CONFIRMED',
  CONFIRMED: 'VEHICLE_RECEIVED',
  VEHICLE_RECEIVED: 'IN_SERVICE',
  IN_SERVICE: 'COMPLETED',
};
const NEXT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Confirm',
  CONFIRMED: 'Mark Vehicle Received',
  VEHICLE_RECEIVED: 'Start Service',
  IN_SERVICE: 'Mark Completed',
  COMPLETED: '',
  CANCELLED: '',
  NO_SHOW: '',
};
const CAN_CANCEL: AppointmentStatus[] = ['SCHEDULED', 'CONFIRMED', 'VEHICLE_RECEIVED'];
const CAN_NO_SHOW: AppointmentStatus[] = ['SCHEDULED', 'CONFIRMED'];

export default function AppointmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const canUpdate = usePermission('appointment:update');
  const canDelete = usePermission('appointment:delete');
  const canCreateInspection = usePermission('inspection:create');

  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const query = useApiQuery<Appointment>(() => apiGet(`/appointments/${params.id}`), [params.id]);

  async function handleStatusChange(status: AppointmentStatus) {
    setIsChangingStatus(true);
    setActionError(null);
    try {
      await apiPatch(`/appointments/${params.id}`, { status });
      query.refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsChangingStatus(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this appointment? This cannot be undone from here.')) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await apiDelete(`/appointments/${params.id}`);
      router.push('/appointments');
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
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

  const appointment = query.data;
  if (!appointment) return null;

  const next = NEXT_STATUS[appointment.status];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-ink">{appointment.serviceType}</h1>
            <AppointmentStatusBadge status={appointment.status} />
          </div>
          <p className="text-sm text-ink-secondary">
            {formatDate(appointment.appointmentDate)} · {appointment.appointmentTime}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/appointments" className="self-center text-sm text-ink-secondary hover:text-ink">
            &larr; Back to appointments
          </Link>
          {canUpdate ? (
            <Button variant="secondary" onClick={() => router.push(`/appointments/${appointment.id}/edit`)}>
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

      {actionError ? <ErrorState message={actionError} /> : null}

      {canUpdate && (next || CAN_CANCEL.includes(appointment.status) || CAN_NO_SHOW.includes(appointment.status)) ? (
        <div className="flex flex-wrap gap-3">
          {next ? (
            <Button onClick={() => handleStatusChange(next)} isLoading={isChangingStatus}>
              {NEXT_STATUS_LABEL[appointment.status]}
            </Button>
          ) : null}
          {CAN_NO_SHOW.includes(appointment.status) ? (
            <Button variant="secondary" onClick={() => handleStatusChange('NO_SHOW')} isLoading={isChangingStatus}>
              Mark No Show
            </Button>
          ) : null}
          {CAN_CANCEL.includes(appointment.status) ? (
            <Button variant="secondary" onClick={() => handleStatusChange('CANCELLED')} isLoading={isChangingStatus}>
              Cancel Appointment
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer & Vehicle</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            <Link
              href={`/customers/${appointment.customer.id}`}
              className="flex flex-col gap-0.5 rounded-lg border border-line bg-surface-hover px-4 py-3 hover:border-accent-400"
            >
              <span className="text-sm font-medium text-ink">{appointment.customer.name}</span>
              <span className="num text-xs text-ink-muted">{appointment.customer.mobile}</span>
            </Link>
            <Link
              href={`/vehicles/${appointment.vehicle.id}`}
              className="flex flex-col gap-0.5 rounded-lg border border-line bg-surface-hover px-4 py-3 hover:border-accent-400"
            >
              <span className="num text-sm font-medium text-ink">{appointment.vehicle.registrationNo}</span>
              <span className="text-xs text-ink-muted">
                {appointment.vehicle.brand} {appointment.vehicle.model}
              </span>
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-4">
            <Field label="Booked" value={formatDate(appointment.createdAt)} />
            {appointment.notes ? (
              <div className="col-span-2">
                <Field label="Notes" value={appointment.notes} />
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>

      {canCreateInspection && appointment.status !== 'CANCELLED' ? (
        <Card>
          <CardBody className="flex items-center justify-between py-4">
            <p className="text-sm text-ink-secondary">Start a digital inspection for this vehicle.</p>
            <Link href={`/inspections/new?vehicleId=${appointment.vehicle.id}&appointmentId=${appointment.id}`}>
              <Button variant="secondary">Start Inspection</Button>
            </Link>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
