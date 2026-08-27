'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { apiGet, apiPatch } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { SupplierFormValues } from '@/lib/validation/supplier';
import type { Supplier } from '@/lib/api-types';
import { SupplierForm } from '@/components/domain/supplier-form';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Toast } from '@/components/ui/toast';

export default function EditSupplierPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const query = useApiQuery<Supplier>(() => apiGet(`/suppliers/${params.id}`), [params.id]);

  async function handleSubmit(values: SupplierFormValues) {
    if (query.data && query.data.isActive !== values.isActive) {
      const action = values.isActive ? 'reactivate' : 'deactivate';
      if (!window.confirm(`This will ${action} "${query.data.name}". Continue?`)) return;
    }
    await apiPatch<Supplier>(`/suppliers/${params.id}`, values);
    setSuccessMessage('Supplier updated successfully.');
    setTimeout(() => router.push(`/suppliers/${params.id}`), 900);
  }

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Edit Supplier</h1>
          <p className="text-sm text-ink-secondary">Update supplier information and payment terms.</p>
        </div>
        <Link href={`/suppliers/${params.id}`}>
          <Button type="button" variant="secondary" size="sm">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Back to Supplier
          </Button>
        </Link>
      </div>

      {query.isLoading ? <Skeleton className="h-96 w-full" /> : null}
      {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}

      {query.data ? (
        <Card>
          <CardBody className="pt-5">
            <SupplierForm
              initial={query.data}
              submitLabel="Save Changes"
              onSubmit={handleSubmit}
              onCancel={() => router.push(`/suppliers/${params.id}`)}
            />
          </CardBody>
        </Card>
      ) : null}

      {successMessage ? <Toast message={successMessage} onDismiss={() => setSuccessMessage(null)} /> : null}
    </div>
  );
}
