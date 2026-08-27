'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ClipboardList, IndianRupee, Wallet, Package, Clock } from 'lucide-react';
import { apiGet, apiPatch, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import type { PaginatedResult, Part, PartCategory, PurchaseOrderListItem, Supplier } from '@/lib/api-types';
import { PurchaseOrderStatusBadge } from '@/components/domain/purchase-order-status-badge';
import { SupplierStatusBadge } from '@/components/domain/supplier-status-badge';
import { SupplierActionsMenu } from '@/components/domain/supplier-actions-menu';
import { KpiCard } from '@/components/domain/kpi-card';
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
  const canCreatePurchaseOrder = usePermission('purchase:create');
  const canReadPurchaseOrders = usePermission('purchase:read');
  const canReadParts = usePermission('part:read');

  const [actionError, setActionError] = useState<string | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const query = useApiQuery<Supplier>(() => apiGet(`/suppliers/${params.id}`), [params.id]);
  const purchaseOrders = useApiQuery<PaginatedResult<PurchaseOrderListItem>>(
    () =>
      canReadPurchaseOrders
        ? apiGet(`/purchase-orders?supplierId=${params.id}&pageSize=10`)
        : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }),
    [params.id, canReadPurchaseOrders],
  );
  const suppliedParts = useApiQuery<PaginatedResult<Part>>(
    () =>
      canReadParts
        ? apiGet(`/parts?supplierId=${params.id}&pageSize=20`)
        : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }),
    [params.id, canReadParts],
  );
  const categories = useApiQuery<PartCategory[]>(() => (canReadParts ? apiGet('/part-categories') : Promise.resolve([])), [canReadParts]);

  async function handleToggleActive() {
    if (!query.data) return;
    setIsTogglingStatus(true);
    setActionError(null);
    try {
      await apiPatch(`/suppliers/${params.id}`, { isActive: !query.data.isActive });
      query.refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not update this supplier.');
    } finally {
      setIsTogglingStatus(false);
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-ink">{supplier.name}</h1>
            <SupplierStatusBadge isActive={supplier.isActive} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/suppliers" className="self-center text-sm text-ink-secondary hover:text-ink">
            &larr; Back to suppliers
          </Link>
          {canCreatePurchaseOrder ? (
            <Link href={`/purchases/new?supplierId=${supplier.id}`}>
              <Button variant="secondary">Create Purchase Order</Button>
            </Link>
          ) : null}
          {canUpdate ? (
            <Button variant="secondary" onClick={() => router.push(`/suppliers/${supplier.id}/edit`)}>
              Edit
            </Button>
          ) : null}
          {canUpdate ? (
            <Button variant={supplier.isActive ? 'danger' : 'primary'} onClick={handleToggleActive} isLoading={isTogglingStatus}>
              {supplier.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          ) : null}
          <SupplierActionsMenu supplier={supplier} onChanged={query.refetch} onError={setActionError} onDeleted={() => router.push('/suppliers')} />
        </div>
      </div>

      {actionError ? <ErrorState message={actionError} /> : null}

      {supplier.stats ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="Purchase Orders" value={formatNumber(supplier.stats.totalPurchaseOrders)} tone="neutral" icon={<ClipboardList className="h-4 w-4" />} />
          <KpiCard label="Total Purchased" value={formatMoney(supplier.stats.totalPurchaseValue)} tone="teal" icon={<IndianRupee className="h-4 w-4" />} />
          <KpiCard
            label="Outstanding Payable"
            value={formatMoney(supplier.stats.outstandingPayable)}
            tone={Number(supplier.stats.outstandingPayable) > 0 ? 'warning' : 'neutral'}
            icon={<Wallet className="h-4 w-4" />}
          />
          <KpiCard label="Parts Supplied" value={formatNumber(supplier.stats.partsSuppliedCount)} tone="fuchsia" icon={<Package className="h-4 w-4" />} />
          <KpiCard
            label="Last Purchase"
            value={supplier.stats.lastPurchaseDate ? formatDate(supplier.stats.lastPurchaseDate) : '—'}
            tone="blue"
            icon={<Clock className="h-4 w-4" />}
          />
        </div>
      ) : null}

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
            <CardTitle>Purchase History {purchaseOrders.data ? `(${purchaseOrders.data.total})` : ''}</CardTitle>
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
                  <li key={po.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <Link href={`/purchases/${po.id}`} className="num font-medium text-ink hover:text-accent-600">
                      {po.poNumber}
                    </Link>
                    <span className="text-xs text-ink-muted">{formatDate(po.createdAt)}</span>
                    <span className="text-xs text-ink-secondary">
                      {po.itemCount} item{po.itemCount === 1 ? '' : 's'}
                    </span>
                    <span className="num text-sm font-medium text-ink">{formatMoney(po.totalAmount)}</span>
                    <PurchaseOrderStatusBadge status={po.status} />
                  </li>
                ))}
              </ul>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {canReadParts ? (
        <Card>
          <CardHeader>
            <CardTitle>Supplied Parts {suppliedParts.data ? `(${suppliedParts.data.total})` : ''}</CardTitle>
          </CardHeader>
          <CardBody>
            {suppliedParts.isLoading ? <Skeleton className="h-10 w-full" /> : null}
            {suppliedParts.error ? <ErrorState message={suppliedParts.error} onRetry={suppliedParts.refetch} /> : null}
            {suppliedParts.data && suppliedParts.data.items.length === 0 ? (
              <p className="text-sm text-ink-muted">This supplier isn&rsquo;t linked to any parts yet.</p>
            ) : null}
            {suppliedParts.data && suppliedParts.data.items.length > 0 ? (
              <ul className="flex flex-col divide-y divide-line">
                {suppliedParts.data.items.map((part) => {
                  const categoryName = categories.data?.find((c) => c.id === part.categoryId)?.name;
                  return (
                    <li key={part.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                      <Link href={`/parts-inventory/${part.id}`} className="flex flex-col hover:text-accent-600">
                        <span className="num text-xs text-ink-muted">{part.partNumber}</span>
                        <span className="font-medium text-ink">{part.name}</span>
                      </Link>
                      {categoryName ? <Badge tone="neutral">{categoryName}</Badge> : null}
                      <span className="num text-sm text-ink">{formatMoney(part.purchasePrice)}</span>
                      <span className="num text-xs text-ink-secondary">{part.currentStock} units</span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
