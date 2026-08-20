'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { VehicleFormValues } from '@/lib/validation/vehicle';
import type { Customer, CustomerRef, VehicleDetail } from '@/lib/api-types';
import { CustomerPicker } from '@/components/domain/customer-picker';
import { VehicleForm } from '@/components/domain/vehicle-form';
import { Card, CardBody } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

export default function NewVehiclePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId');

  // Coming from a customer's own profile ("Add Vehicle") pre-fills and
  // locks the owner; arriving at /vehicles/new directly (from the
  // Vehicles list) instead shows the CustomerPicker below.
  const preselected = useApiQuery<Customer>(
    () => (preselectedCustomerId ? apiGet(`/customers/${preselectedCustomerId}`) : Promise.reject(new Error('n/a'))),
    [preselectedCustomerId],
  );

  const [pickedCustomer, setPickedCustomer] = useState<CustomerRef | null>(null);
  const customer: CustomerRef | null = preselectedCustomerId ? preselected.data : pickedCustomer;

  async function handleSubmit(values: VehicleFormValues) {
    if (!customer) return;
    const vehicle = await apiPost<VehicleDetail>('/vehicles', { ...values, customerId: customer.id });
    router.push(`/vehicles/${vehicle.id}`);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">New Vehicle</h1>
        <p className="text-sm text-ink-secondary">Add a new vehicle to a customer&rsquo;s record.</p>
      </div>

      {preselectedCustomerId && preselected.isLoading ? <Skeleton className="h-10 w-full max-w-sm" /> : null}
      {preselectedCustomerId && preselected.error ? (
        <ErrorState message={preselected.error} onRetry={preselected.refetch} />
      ) : null}

      <Card>
        <CardBody className="flex flex-col gap-5 pt-5">
          {!preselectedCustomerId && !customer ? (
            <CustomerPicker value={pickedCustomer} onChange={setPickedCustomer} />
          ) : null}
          {customer ? (
            <VehicleForm
              customer={customer}
              submitLabel="Create Vehicle"
              onSubmit={handleSubmit}
              onCancel={() => router.back()}
            />
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
