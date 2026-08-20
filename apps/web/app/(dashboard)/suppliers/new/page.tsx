'use client';

import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api-client';
import type { SupplierFormValues } from '@/lib/validation/supplier';
import type { Supplier } from '@/lib/api-types';
import { SupplierForm } from '@/components/domain/supplier-form';
import { Card, CardBody } from '@/components/ui/card';

export default function NewSupplierPage() {
  const router = useRouter();

  async function handleSubmit(values: SupplierFormValues) {
    const supplier = await apiPost<Supplier>('/suppliers', values);
    router.push(`/suppliers/${supplier.id}`);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">New Supplier</h1>
        <p className="text-sm text-ink-secondary">Add a new parts supplier.</p>
      </div>
      <Card>
        <CardBody className="pt-5">
          <SupplierForm submitLabel="Create Supplier" onSubmit={handleSubmit} onCancel={() => router.back()} />
        </CardBody>
      </Card>
    </div>
  );
}
