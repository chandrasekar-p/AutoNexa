'use client';

import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api-client';
import type { PartFormValues } from '@/lib/validation/part';
import type { Part } from '@/lib/api-types';
import { PartForm } from '@/components/domain/part-form';
import { Card, CardBody } from '@/components/ui/card';

export default function NewPartPage() {
  const router = useRouter();

  async function handleSubmit(values: PartFormValues) {
    const part = await apiPost<Part>('/parts', values);
    router.push(`/parts-inventory/${part.id}`);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">New Part</h1>
        <p className="text-sm text-ink-secondary">Add a new part to the catalogue.</p>
      </div>
      <Card>
        <CardBody className="pt-5">
          <PartForm submitLabel="Create Part" onSubmit={handleSubmit} onCancel={() => router.back()} />
        </CardBody>
      </Card>
    </div>
  );
}
