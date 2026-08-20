'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiDelete, apiGet, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { formatDate } from '@/lib/format';
import type { PaginatedResult, PurchaseOrderListItem, Supplier } from '@/lib/api-types';
import { PurchaseOrderStatusBadge } from '@/components/domain/purchase-order-status-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
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

export default function SupplierDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const canUpdate = usePermission('supplier:update');
  const canDelete = usePermission('supplier:delete');
  const canCreatePurchaseOrder = usePermission('purchase:create');
  const canReadPurchaseOrders = usePermission('purchase:read');

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const query = useApiQuery<Supplier>(() => apiGet(`/suppliers/${params.id}`), [params.id]);
  const purchaseOrders = useApiQuery<PaginatedResult<PurchaseOrderListItem>>(
    () =>
      canReadPurchaseOrders
        ? apiGet(`/purchase-orders?supplierId=${params.id}&pageSize=10`)
        : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }),
    [params.id, canReadPurchaseOrders],
  );

  async function handleDelete() {
    if (!window.confirm('Delete this supplier? This cannot be undone from here.')) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await apiDelete(`/suppliers/${params.id}`);
      router.push('/suppliers');
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

  const supplier = query.data;
  if (!supplier) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-ink">{supplier.name}</h1>
            <Badge tone={supplier.isActive ? 'success' : 'neutral'}>{supplier.isActive ? 'Active' : 'Inactive'}</Badge>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/suppliers" className="self-center text-sm text-ink-secondary hover:text-ink">
            &larr; Back to suppliers
          </Link>
          {canCreatePurchaseOrder ? (
            <Link href={`/purchases/new?supplierId=${supplier.id}`}>
              <Button variant="secondary">New Purchase Order</Button>
            </Link>
          ) : null}
          {canUpdate ? (
            <Button variant="secondary" onClick={() => router.push(`/suppliers/${supplier.id}/edit`)}>
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

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-4">
          <Field label="Contact Person" value={supplier.contactPerson} />
          <Field label="Mobile" value={supplier.mobile} />
          <Field label="Email" value={supplier.email} />
          <Field label="GSTIN" value={supplier.gstin} />
          <Field label="Payment Terms" value={supplier.paymentTerms} />
          <div className="col-span-2">
            <Field label="Address" value={supplier.address} />
          </div>
        </CardBody>
      </Card>

      {canReadPurchaseOrders ? (
        <Card>
          <CardHeader>
            <CardTitle>Purchase Orders {purchaseOrders.data ? `(${purchaseOrders.data.total})` : ''}</CardTitle>
          </CardHeader>
          <CardBody>
            {purchaseOrders.isLoading ? <Skeleton className="h-10 w-full" /> : null}
            {purchaseOrders.error ? <ErrorState message={purchaseOrders.error} onRetry={purchaseOrders.refetch} /> : null}
            {purchaseOrders.data && purchaseOrders.data.items.length === 0 ? (
              <p className="text-sm text-ink-muted">No purchase orders on file yet.</p>
            ) : null}
            {purchaseOrders.data && purchaseOrders.data.items.length > 0 ? (
              <ul className="flex flex-col divide-y divide-line">
                {purchaseOrders.data.items.map((po) => (
                  <li key={po.id} className="flex items-center justify-between py-2.5 text-sm">
                    <Link href={`/purchases/${po.id}`} className="num text-ink hover:text-accent-600">
                      {po.poNumber}
                    </Link>
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-ink-muted">{formatDate(po.createdAt)}</span>
                      <PurchaseOrderStatusBadge status={po.status} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
