'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { apiGet, apiPatch } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { ServicePackageFormValues } from '@/lib/validation/service-package';
import type { ServicePackage } from '@/lib/api-types';
import { ServicePackageForm } from '@/components/domain/service-package-form';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Toast } from '@/components/ui/toast';

export default function EditServicePackagePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const query = useApiQuery<ServicePackage>(() => apiGet(`/service-packages/${params.id}`), [params.id]);

  async function handleSubmit(values: ServicePackageFormValues) {
    await apiPatch<ServicePackage>(`/service-packages/${params.id}`, values);
    setSuccessMessage('Package updated successfully.');
    setTimeout(() => router.push(`/service-packages/${params.id}`), 900);
  }

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Edit Service Package</h1>
          <p className="text-sm text-ink-secondary">Editing terms only affects future sales — packages already sold keep their snapshotted terms.</p>
        </div>
        <Link href={`/service-packages/${params.id}`}>
          <Button type="button" variant="secondary" size="sm">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Back to Package
          </Button>
        </Link>
      </div>

      {query.isLoading ? <Skeleton className="h-96 w-full" /> : null}
      {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}

      {query.data ? (
        <Card>
          <CardBody className="pt-5">
            <ServicePackageForm
              initial={query.data}
              submitLabel="Save Changes"
              onSubmit={handleSubmit}
              onCancel={() => router.push(`/service-packages/${params.id}`)}
            />
          </CardBody>
        </Card>
      ) : null}

      {successMessage ? <Toast message={successMessage} onDismiss={() => setSuccessMessage(null)} /> : null}
    </div>
  );
}
