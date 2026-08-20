'use client';

import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiPatch } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { CustomerFormValues } from '@/lib/validation/customer';
import type { Customer } from '@/lib/api-types';
import { CustomerForm } from '@/components/domain/customer-form';
import { Card, CardBody } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

export default function EditCustomerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const query = useApiQuery<Customer>(() => apiGet(`/customers/${params.id}`), [params.id]);

  async function handleSubmit(values: CustomerFormValues) {
    await apiPatch<Customer>(`/customers/${params.id}`, values);
    router.push(`/customers/${params.id}`);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Edit Customer</h1>
        <p className="text-sm text-ink-secondary">Update this customer&rsquo;s details.</p>
      </div>

      {query.isLoading ? <Skeleton className="h-96 w-full" /> : null}
      {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}

      {query.data ? (
        <Card>
          <CardBody className="pt-5">
            <CustomerForm
              initial={query.data}
              submitLabel="Save Changes"
              onSubmit={handleSubmit}
              onCancel={() => router.back()}
            />
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
