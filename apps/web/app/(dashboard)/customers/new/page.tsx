'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Car, FileText, Info, UserPlus, Wrench } from 'lucide-react';
import { apiPost } from '@/lib/api-client';
import type { CustomerFormValues } from '@/lib/validation/customer';
import type { Customer } from '@/lib/api-types';
import { CustomerForm } from '@/components/domain/customer-form';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';

const NEXT_STEPS = [
  { icon: Car, title: 'Add Vehicles', description: 'Add one or more vehicles owned by this customer.' },
  { icon: FileText, title: 'Create Estimates', description: 'Create estimates and get approvals from the customer.' },
  { icon: Wrench, title: 'Track Service History', description: 'Manage job cards, invoices and service history.' },
];

export default function NewCustomerPage() {
  const router = useRouter();

  async function handleSubmit(values: CustomerFormValues) {
    const customer = await apiPost<Customer>('/customers', values);
    router.push(`/customers/${customer.id}`);
  }

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <nav className="flex items-center gap-1.5 text-xs text-ink-muted">
        <Link href="/customers" className="hover:text-ink">
          Customers
        </Link>
        <span>›</span>
        <span className="text-ink-secondary">New Customer</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-400">
            <UserPlus className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-ink">New Customer</h1>
            <p className="text-sm text-ink-secondary">Add customer details to build their profile and manage vehicles, services, invoices and reminders.</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5 rounded-lg border border-accent-200 bg-accent-50 px-4 py-3 text-xs dark:border-accent-500/30 dark:bg-accent-500/10">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-600 dark:text-accent-400" aria-hidden />
          <p className="text-ink-secondary">
            <span className="font-medium text-ink">Only Name and Mobile are mandatory.</span>
            <br />
            You can add more details anytime later.
          </p>
        </div>
      </div>

      <CustomerForm
        submitLabel="Create Customer"
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        sidebarExtra={
          <Card>
            <CardHeader>
              <CardTitle>What&rsquo;s Next?</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-4 pt-2">
              {NEXT_STEPS.map((step) => (
                <div key={step.title} className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-hover text-ink-secondary">
                    <step.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink">{step.title}</p>
                    <p className="text-xs text-ink-muted">{step.description}</p>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        }
      />
    </div>
  );
}
