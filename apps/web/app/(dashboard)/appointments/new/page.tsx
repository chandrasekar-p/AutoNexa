'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { AppointmentFormValues } from '@/lib/validation/appointment';
import type { Appointment, Customer, CustomerRef, PaginatedResult, VehicleListItem } from '@/lib/api-types';
import { CustomerPicker } from '@/components/domain/customer-picker';
import { AppointmentForm } from '@/components/domain/appointment-form';
import { Card, CardBody } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

export default function NewAppointmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId');
  const preselectedVehicleId = searchParams.get('vehicleId');

  // Arriving from a customer/vehicle's own page (e.g. "Book Appointment")
  // pre-fills and locks both; arriving at /appointments/new directly shows
  // the CustomerPicker + vehicle dropdown below instead.
  const preselectedCustomer = useApiQuery<Customer>(
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

  async function handleSubmit(values: AppointmentFormValues) {
    if (!customer || !selectedVehicle) return;
    const appointment = await apiPost<Appointment>('/appointments', {
      ...values,
      customerId: customer.id,
      vehicleId: selectedVehicle.id,
    });
    router.push(`/appointments/${appointment.id}`);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">New Appointment</h1>
        <p className="text-sm text-ink-secondary">Book a service appointment for a customer&rsquo;s vehicle.</p>
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
                  before booking an appointment.
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
            <AppointmentForm
              customer={customer}
              vehicle={selectedVehicle}
              submitLabel="Create Appointment"
              onSubmit={handleSubmit}
              onCancel={() => router.back()}
            />
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
