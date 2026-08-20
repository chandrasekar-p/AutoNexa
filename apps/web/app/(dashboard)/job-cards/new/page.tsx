'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useStaffOptions } from '@/lib/hooks/use-staff-options';
import type { CustomerRef, JobCardDetail, PaginatedResult, Technician, VehicleListItem } from '@/lib/api-types';
import { CustomerPicker } from '@/components/domain/customer-picker';
import { Card, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

export default function NewJobCardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId');
  const preselectedVehicleId = searchParams.get('vehicleId');

  const preselectedCustomer = useApiQuery<CustomerRef>(
    () => (preselectedCustomerId ? apiGet(`/customers/${preselectedCustomerId}`) : Promise.reject(new Error('n/a'))),
    [preselectedCustomerId],
  );

  const [pickedCustomer, setPickedCustomer] = useState<CustomerRef | null>(null);
  const [vehicleId, setVehicleId] = useState(preselectedVehicleId ?? '');
  const customer: CustomerRef | null = preselectedCustomerId ? preselectedCustomer.data : pickedCustomer;

  const vehicles = useApiQuery<PaginatedResult<VehicleListItem>>(
    () =>
      customer
        ? apiGet(`/vehicles?customerId=${customer.id}&pageSize=100`)
        : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 100, totalPages: 0 }),
    [customer?.id],
  );
  const selectedVehicle = vehicles.data?.items.find((v) => v.id === vehicleId) ?? null;

  const technicians = useApiQuery<PaginatedResult<Technician>>(
    () => apiGet('/technicians?status=ACTIVE&pageSize=100'),
    [],
  );
  const staff = useStaffOptions();

  const [complaint, setComplaint] = useState('');
  const [customerRequest, setCustomerRequest] = useState('');
  const [estimatedWork, setEstimatedWork] = useState('');
  const [odometer, setOdometer] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [serviceAdvisorId, setServiceAdvisorId] = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customer || !selectedVehicle) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      const jobCard = await apiPost<JobCardDetail>('/job-cards', {
        customerId: customer.id,
        vehicleId: selectedVehicle.id,
        complaint: complaint || undefined,
        customerRequest: customerRequest || undefined,
        estimatedWork: estimatedWork || undefined,
        odometer: odometer ? Number(odometer) : undefined,
        technicianId: technicianId || undefined,
        serviceAdvisorId: serviceAdvisorId || undefined,
        expectedDelivery: expectedDelivery || undefined,
      });
      router.push(`/job-cards/${jobCard.id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">New Job Card</h1>
        <p className="text-sm text-ink-secondary">For a walk-in vehicle with no estimate on file.</p>
      </div>

      {preselectedCustomerId && preselectedCustomer.isLoading ? <Skeleton className="h-10 w-full max-w-sm" /> : null}
      {preselectedCustomerId && preselectedCustomer.error ? (
        <ErrorState message={preselectedCustomer.error} onRetry={preselectedCustomer.refetch} />
      ) : null}

      <Card>
        <CardBody className="flex flex-col gap-5 pt-5">
          {!preselectedCustomerId && !customer ? <CustomerPicker value={pickedCustomer} onChange={setPickedCustomer} /> : null}

          {customer && !selectedVehicle ? (
            <div className="flex flex-col gap-4">
              <div className="flex h-10 items-center justify-between rounded border border-line bg-surface-hover px-3">
                <span className="text-sm text-ink">
                  {customer.name} <span className="num text-ink-muted">· {customer.mobile}</span>
                </span>
                {!preselectedCustomerId ? (
                  <button type="button" onClick={() => setPickedCustomer(null)} className="text-xs text-accent-600 hover:underline">
                    Change
                  </button>
                ) : null}
              </div>

              {vehicles.isLoading ? <Skeleton className="h-10 w-full" /> : null}
              {vehicles.error ? <ErrorState message={vehicles.error} onRetry={vehicles.refetch} /> : null}

              {vehicles.data && vehicles.data.items.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  This customer has no vehicles on file yet.{' '}
                  <Link href={`/vehicles/new?customerId=${customer.id}`} className="text-accent-600 hover:underline">
                    Add one
                  </Link>{' '}
                  before creating a job card.
                </p>
              ) : null}

              {vehicles.data && vehicles.data.items.length > 0 ? (
                <Select label="Vehicle" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                  <option value="">Select a vehicle…</option>
                  {vehicles.data.items.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNo} — {v.brand} {v.model}
                    </option>
                  ))}
                </Select>
              ) : null}
            </div>
          ) : null}

          {customer && selectedVehicle ? (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex h-10 items-center justify-between rounded border border-line bg-surface-hover px-3">
                  <span className="text-sm text-ink">{customer.name}</span>
                  <span className="text-micro font-semibold uppercase tracking-wide text-ink-muted">Customer</span>
                </div>
                <div className="flex h-10 items-center justify-between rounded border border-line bg-surface-hover px-3">
                  <span className="num text-sm text-ink">{selectedVehicle.registrationNo}</span>
                  <span className="text-micro font-semibold uppercase tracking-wide text-ink-muted">Vehicle</span>
                </div>
              </div>

              <Textarea label="Complaint" value={complaint} onChange={(e) => setComplaint(e.target.value)} />
              <Textarea label="Customer Request" value={customerRequest} onChange={(e) => setCustomerRequest(e.target.value)} />
              <Textarea label="Estimated Work" value={estimatedWork} onChange={(e) => setEstimatedWork(e.target.value)} />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Odometer (km)" type="number" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
                <Input
                  label="Expected Delivery"
                  type="date"
                  value={expectedDelivery}
                  onChange={(e) => setExpectedDelivery(e.target.value)}
                />
                {technicians.data && technicians.data.items.length > 0 ? (
                  <Select label="Technician" value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}>
                    <option value="">—</option>
                    {technicians.data.items.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.user.name}
                      </option>
                    ))}
                  </Select>
                ) : null}
                {staff.isAvailable ? (
                  <Select label="Service Advisor" value={serviceAdvisorId} onChange={(e) => setServiceAdvisorId(e.target.value)}>
                    <option value="">—</option>
                    {staff.options.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                ) : null}
              </div>

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
                  Create Job Card
                </Button>
              </div>
            </form>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
