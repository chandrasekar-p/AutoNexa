'use client';

import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api-client';
import type { CustomerFormValues } from '@/lib/validation/customer';
import type { Customer } from '@/lib/api-types';
import { CustomerForm } from '@/components/domain/customer-form';
import { Card, CardBody } from '@/components/ui/card';

export default function NewCustomerPage() {
  const router = useRouter();

  async function handleSubmit(values: CustomerFormValues) {
    const customer = await apiPost<Customer>('/customers', values);
    router.push(`/customers/${customer.id}`);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">New Customer</h1>
        <p className="text-sm text-ink-secondary">Add a new customer to the workshop&rsquo;s records.</p>
      </div>
      <Card>
        <CardBody className="pt-5">
          <CustomerForm submitLabel="Create Customer" onSubmit={handleSubmit} onCancel={() => router.back()} />
        </CardBody>
      </Card>
    </div>
  );
}
