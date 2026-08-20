'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useStaffOptions } from '@/lib/hooks/use-staff-options';
import type { InspectionDetail, VehicleDetail } from '@/lib/api-types';
import { Card, CardBody } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

export default function NewInspectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vehicleId = searchParams.get('vehicleId');
  const appointmentId = searchParams.get('appointmentId');

  const vehicle = useApiQuery<VehicleDetail>(
    () => (vehicleId ? apiGet(`/vehicles/${vehicleId}`) : Promise.reject(new Error('no vehicleId'))),
    [vehicleId],
  );
  const staff = useStaffOptions();

  const [technicianId, setTechnicianId] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vehicleId) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      const inspection = await apiPost<InspectionDetail>('/inspections', {
        vehicleId,
        appointmentId: appointmentId ?? undefined,
        technicianId: technicianId || undefined,
        notes: notes || undefined,
      });
      router.push(`/inspections/${inspection.id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  }

  if (!vehicleId) {
    return (
      <ErrorState message="A vehicle is required to start an inspection — start one from a vehicle's page instead." />
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">New Inspection</h1>
        <p className="text-sm text-ink-secondary">
          Starts a standard exterior/interior/mechanical checklist for this vehicle.
        </p>
      </div>

      {vehicle.isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {vehicle.error ? <ErrorState message={vehicle.error} onRetry={vehicle.refetch} /> : null}

      {vehicle.data ? (
        <Card>
          <CardBody className="flex flex-col gap-5 pt-5">
            <div className="flex h-10 items-center justify-between rounded border border-line bg-surface-hover px-3">
              <span className="num text-sm text-ink">
                {vehicle.data.registrationNo}{' '}
                <span className="text-ink-muted">
                  · {vehicle.data.brand} {vehicle.data.model}
                </span>
              </span>
              <span className="text-micro font-semibold uppercase tracking-wide text-ink-muted">Vehicle</span>
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              {staff.isAvailable ? (
                <Select label="Technician" value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}>
                  <option value="">—</option>
                  {staff.options.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              ) : null}
              <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

              {formError ? (
                <p
                  role="alert"
                  className="rounded border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400"
                >
                  {formError}
                </p>
              ) : null}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => router.back()} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  Start Inspection
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
