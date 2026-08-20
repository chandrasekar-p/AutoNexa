'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { EstimateDetail, VehicleDetail } from '@/lib/api-types';
import { Card, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

export default function NewEstimatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vehicleId = searchParams.get('vehicleId');

  const vehicle = useApiQuery<VehicleDetail>(
    () => (vehicleId ? apiGet(`/vehicles/${vehicleId}`) : Promise.reject(new Error('no vehicleId'))),
    [vehicleId],
  );

  const [jobDescription, setJobDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vehicle.data) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      const estimate = await apiPost<EstimateDetail>('/estimates', {
        customerId: vehicle.data.customer.id,
        vehicleId: vehicle.data.id,
        jobDescription: jobDescription || undefined,
      });
      router.push(`/estimates/${estimate.id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  }

  if (!vehicleId) {
    return <ErrorState message="A vehicle is required to create an estimate — start one from a vehicle's page instead." />;
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">New Estimate</h1>
        <p className="text-sm text-ink-secondary">Line items can be added once the estimate is created.</p>
      </div>

      {vehicle.isLoading ? <Skeleton className="h-48 w-full" /> : null}
      {vehicle.error ? <ErrorState message={vehicle.error} onRetry={vehicle.refetch} /> : null}

      {vehicle.data ? (
        <Card>
          <CardBody className="flex flex-col gap-5 pt-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex h-10 items-center justify-between rounded border border-line bg-surface-hover px-3">
                <span className="text-sm text-ink">
                  {vehicle.data.customer.name} <span className="num text-ink-muted">· {vehicle.data.customer.mobile}</span>
                </span>
                <span className="text-micro font-semibold uppercase tracking-wide text-ink-muted">Customer</span>
              </div>
              <div className="flex h-10 items-center justify-between rounded border border-line bg-surface-hover px-3">
                <span className="num text-sm text-ink">
                  {vehicle.data.registrationNo}{' '}
                  <span className="text-ink-muted">
                    · {vehicle.data.brand} {vehicle.data.model}
                  </span>
                </span>
                <span className="text-micro font-semibold uppercase tracking-wide text-ink-muted">Vehicle</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <Input
                label="Job Description"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="e.g. Front brake pad replacement + general check"
              />

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
                  Create Estimate
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
