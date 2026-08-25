'use client';

import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiPatch } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { VehicleFormValues } from '@/lib/validation/vehicle';
import type { VehicleDetail } from '@/lib/api-types';
import { VehicleForm } from '@/components/domain/vehicle-form';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

export default function EditVehiclePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const query = useApiQuery<VehicleDetail>(() => apiGet(`/vehicles/${params.id}`), [params.id]);

  async function handleSubmit(values: VehicleFormValues) {
    await apiPatch<VehicleDetail>(`/vehicles/${params.id}`, values);
    router.push(`/vehicles/${params.id}`);
  }

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Edit Vehicle</h1>
        <p className="text-sm text-ink-secondary">Update this vehicle&rsquo;s details.</p>
      </div>

      {query.isLoading ? <Skeleton className="h-96 w-full" /> : null}
      {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}

      {query.data ? (
        <VehicleForm customer={query.data.customer} initial={query.data} submitLabel="Save Changes" onSubmit={handleSubmit} onCancel={() => router.back()} />
      ) : null}
    </div>
  );
}
