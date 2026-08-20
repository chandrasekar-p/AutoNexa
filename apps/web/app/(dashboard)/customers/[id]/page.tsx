'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiDelete, apiGet, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { formatDate, formatMoney } from '@/lib/format';
import type { CustomerDetail } from '@/lib/api-types';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-micro font-semibold uppercase tracking-wide text-ink-secondary">{label}</span>
      <span className="text-sm text-ink">{value ?? '—'}</span>
    </div>
  );
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const canUpdate = usePermission('customer:update');
  const canDelete = usePermission('customer:delete');
  const canCreateVehicle = usePermission('vehicle:create');

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const query = useApiQuery<CustomerDetail>(() => apiGet(`/customers/${params.id}`), [params.id]);

  async function handleDelete() {
    if (!window.confirm('Delete this customer? This cannot be undone from here.')) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await apiDelete(`/customers/${params.id}`);
      router.push('/customers');
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setIsDeleting(false);
    }
  }

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (query.error) {
    return <ErrorState message={query.error} onRetry={query.refetch} />;
  }

  const customer = query.data;
  if (!customer) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-ink">{customer.name}</h1>
            <Badge tone={customer.customerType === 'business' ? 'accent' : 'neutral'}>{customer.customerType}</Badge>
          </div>
          <p className="num text-sm text-ink-secondary">{customer.mobile}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/customers" className="self-center text-sm text-ink-secondary hover:text-ink">
            &larr; Back to customers
          </Link>
          {canUpdate ? (
            <Button variant="secondary" onClick={() => router.push(`/customers/${customer.id}/edit`)}>
              Edit
            </Button>
          ) : null}
          {canDelete ? (
            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      {deleteError ? <ErrorState message={deleteError} /> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact & Billing</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-4">
            <Field label="Alternate Mobile" value={customer.altMobile} />
            <Field label="Email" value={customer.email} />
            <Field label="City" value={customer.city} />
            <Field label="State" value={customer.state} />
            <Field label="GSTIN" value={customer.gstin} />
            <Field label="Customer Since" value={formatDate(customer.createdAt)} />
            <div className="col-span-2">
              <Field label="Address" value={customer.address} />
            </div>
            {customer.notes ? (
              <div className="col-span-2">
                <Field label="Notes" value={customer.notes} />
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outstanding Balance</CardTitle>
          </CardHeader>
          <CardBody>
            <span className="num text-3xl font-semibold text-ink">{formatMoney(customer.totalOutstanding)}</span>
            <p className="mt-1 text-xs text-ink-muted">
              Across {customer.invoices.filter((i) => i.status !== 'PAID' && i.status !== 'REFUNDED').length} unpaid
              invoice(s) of {customer.invoices.length} total.
            </p>
            {customer.invoices.length > 0 ? (
              <ul className="mt-4 flex flex-col divide-y divide-line">
                {customer.invoices.map((invoice) => (
                  <li key={invoice.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-ink">
                      {invoice.invoiceNumber} <span className="text-ink-muted">· {formatDate(invoice.createdAt)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="num text-ink">{formatMoney(invoice.grandTotal)}</span>
                      <Badge
                        tone={
                          invoice.status === 'PAID'
                            ? 'success'
                            : invoice.status === 'REFUNDED'
                              ? 'neutral'
                              : 'warning'
                        }
                      >
                        {invoice.status.replace('_', ' ').toLowerCase()}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-ink-muted">No invoices yet.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vehicles ({customer.vehicles.length})</CardTitle>
          {canCreateVehicle ? (
            <Link href={`/vehicles/new?customerId=${customer.id}`} className="text-xs font-medium text-accent-600 hover:underline">
              + Add Vehicle
            </Link>
          ) : null}
        </CardHeader>
        <CardBody>
          {customer.vehicles.length === 0 ? (
            <p className="text-sm text-ink-muted">No vehicles on file yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {customer.vehicles.map((vehicle) => (
                <li key={vehicle.id} className="flex items-center justify-between py-2.5 text-sm">
                  <Link href={`/vehicles/${vehicle.id}`} className="text-ink hover:text-accent-600">
                    <span className="num font-medium">{vehicle.registrationNo}</span>{' '}
                    <span className="text-ink-secondary">
                      — {vehicle.brand} {vehicle.model}
                      {vehicle.variant ? ` ${vehicle.variant}` : ''}
                    </span>
                  </Link>
                  {vehicle.insuranceExpiry ? (
                    <span className="text-xs text-ink-muted">
                      Insurance until {formatDate(vehicle.insuranceExpiry)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
