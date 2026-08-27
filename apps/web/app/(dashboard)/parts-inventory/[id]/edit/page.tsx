'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { apiGet, apiPatch } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { PartFormValues } from '@/lib/validation/part';
import type { Part } from '@/lib/api-types';
import { PartForm } from '@/components/domain/part-form';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

export default function EditPartPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const query = useApiQuery<Part>(() => apiGet(`/parts/${params.id}`), [params.id]);

  async function handleSubmit(values: PartFormValues) {
    await apiPatch<Part>(`/parts/${params.id}`, values);
    router.push(`/parts-inventory/${params.id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Edit Part</h1>
          <p className="text-sm text-ink-secondary">Update catalogue, pricing and inventory settings.</p>
        </div>
        <Link href={`/parts-inventory/${params.id}`}>
          <Button type="button" variant="secondary" size="sm">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Back to Parts
          </Button>
        </Link>
      </div>

      {query.isLoading ? <Skeleton className="h-96 w-full" /> : null}
      {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}

      {query.data ? (
        <Card>
          <CardBody className="pt-5">
            <PartForm initial={query.data} submitLabel="Save Changes" onSubmit={handleSubmit} onCancel={() => router.push(`/parts-inventory/${params.id}`)} />
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
