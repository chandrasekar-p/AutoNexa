'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bell, Car, Lightbulb, Users } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { VehicleFormValues } from '@/lib/validation/vehicle';
import type { Customer, CustomerRef, VehicleDetail } from '@/lib/api-types';
import { CustomerPicker } from '@/components/domain/customer-picker';
import { VehicleForm } from '@/components/domain/vehicle-form';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

const WHY_THESE_DETAILS = [
  { icon: Car, title: 'Accurate Records', description: 'Helps maintain complete vehicle history and documentation.' },
  { icon: Bell, title: 'Smart Reminders', description: 'Get automatic reminders for insurance, PUC and service.' },
  { icon: Users, title: 'Better Service', description: 'Helps your team provide faster and personalized service.' },
];

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
    <div className="flex max-w-6xl flex-col gap-6">
      <nav className="flex items-center gap-1.5 text-xs text-ink-muted">
        <Link href="/vehicles" className="hover:text-ink">
          Vehicles
        </Link>
        <span>›</span>
        <span className="text-ink-secondary">New Vehicle</span>
      </nav>

      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-400">
          <Car className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-ink">New Vehicle</h1>
          <p className="text-sm text-ink-secondary">Add a vehicle to the customer&rsquo;s record.</p>
        </div>
      </div>

      {preselectedCustomerId && preselected.isLoading ? <Skeleton className="h-14 w-full" /> : null}
      {preselectedCustomerId && preselected.error ? (
        <ErrorState message={preselected.error} onRetry={preselected.refetch} />
      ) : null}

      {!preselectedCustomerId && !customer ? (
        <Card>
          <CardBody className="pt-5">
            <CustomerPicker value={pickedCustomer} onChange={setPickedCustomer} />
          </CardBody>
        </Card>
      ) : null}

      {customer ? (
        <VehicleForm
          customer={customer}
          submitLabel="Create Vehicle"
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          sidebarExtra={
            <Card>
              <CardHeader>
                <CardTitle>Why these details?</CardTitle>
              </CardHeader>
              <CardBody className="flex flex-col gap-4 pt-2">
                {WHY_THESE_DETAILS.map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-hover text-ink-secondary">
                      <item.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink">{item.title}</p>
                      <p className="text-xs text-ink-muted">{item.description}</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-start gap-2.5 rounded-lg bg-accent-50 px-3 py-2.5 text-xs dark:bg-accent-500/10">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent-600 dark:text-accent-400" aria-hidden />
                  <p className="text-ink-secondary">
                    <span className="font-medium text-ink">Tip:</span> Adding VIN helps in accurate identification and prevents duplicate
                    entries.
                  </p>
                </div>
              </CardBody>
            </Card>
          }
        />
      ) : null}
    </div>
  );
}
