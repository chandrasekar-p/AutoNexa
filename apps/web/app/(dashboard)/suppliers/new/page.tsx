'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { apiPost } from '@/lib/api-client';
import type { SupplierFormValues } from '@/lib/validation/supplier';
import type { Supplier } from '@/lib/api-types';
import { SupplierForm } from '@/components/domain/supplier-form';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';

export default function NewSupplierPage() {
  const router = useRouter();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(values: SupplierFormValues) {
    // Errors are caught and displayed inline by SupplierForm itself —
    // left to propagate here so its own isSubmitting/formError state
    // resets correctly.
    const supplier = await apiPost<Supplier>('/suppliers', values);
    setSuccessMessage('Supplier created successfully.');
    setTimeout(() => router.push(`/suppliers/${supplier.id}`), 900);
  }

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">New Supplier</h1>
          <p className="text-sm text-ink-secondary">Add a new parts supplier to your workshop network.</p>
        </div>
        <Link href="/suppliers">
          <Button type="button" variant="secondary" size="sm">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Back to Suppliers
          </Button>
        </Link>
      </div>

      <Card>
        <CardBody className="pt-5">
          <SupplierForm submitLabel="Create Supplier" onSubmit={handleSubmit} onCancel={() => router.push('/suppliers')} />
        </CardBody>
      </Card>

      {successMessage ? <Toast message={successMessage} onDismiss={() => setSuccessMessage(null)} /> : null}
    </div>
  );
}
