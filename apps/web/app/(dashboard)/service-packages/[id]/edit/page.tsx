'use client';

import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiPatch } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { ServicePackageFormValues } from '@/lib/validation/service-package';
import type { ServicePackage } from '@/lib/api-types';
import { ServicePackageForm } from '@/components/domain/service-package-form';
import { Card, CardBody } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

export default function EditServicePackagePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const query = useApiQuery<ServicePackage>(() => apiGet(`/service-packages/${params.id}`), [params.id]);

  async function handleSubmit(values: ServicePackageFormValues) {
    await apiPatch<ServicePackage>(`/service-packages/${params.id}`, values);
    router.push('/service-packages');
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Edit Service Package</h1>
        <p className="text-sm text-ink-secondary">Editing terms only affects future sales — packages already sold keep their snapshotted terms.</p>
      </div>

      {query.isLoading ? <Skeleton className="h-96 w-full" /> : null}
      {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}

      {query.data ? (
        <Card>
          <CardBody className="pt-5">
            <ServicePackageForm initial={query.data} submitLabel="Save Changes" onSubmit={handleSubmit} onCancel={() => router.back()} />
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
