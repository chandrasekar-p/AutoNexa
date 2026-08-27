'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { apiPost } from '@/lib/api-client';
import type { PartFormValues } from '@/lib/validation/part';
import type { Part } from '@/lib/api-types';
import { PartForm } from '@/components/domain/part-form';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function NewPartPage() {
  const router = useRouter();

  async function handleSubmit(values: PartFormValues) {
    const part = await apiPost<Part>('/parts', values);
    router.push(`/parts-inventory/${part.id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">New Part</h1>
          <p className="text-sm text-ink-secondary">Add a part to your workshop catalogue.</p>
        </div>
        <Link href="/parts-inventory">
          <Button type="button" variant="secondary" size="sm">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Back to Parts
          </Button>
        </Link>
      </div>
      <Card>
        <CardBody className="pt-5">
          <PartForm submitLabel="Create Part" onSubmit={handleSubmit} onCancel={() => router.push('/parts-inventory')} />
        </CardBody>
      </Card>
    </div>
  );
}
