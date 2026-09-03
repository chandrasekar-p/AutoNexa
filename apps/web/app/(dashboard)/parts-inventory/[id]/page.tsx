'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Pencil, Wrench, ShoppingCart } from 'lucide-react';
import { apiDelete, apiGet, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { formatDate, formatMoney, formatQuantity } from '@/lib/format';
import { derivePartStockStatus } from '@/lib/parts/stock-status';
import type { InventoryTransactionEntry, PaginatedResult, Part, PartCategory, Supplier } from '@/lib/api-types';
import { StockStatusBadge } from '@/components/domain/stock-status-badge';
import { StockAdjustmentModal } from '@/components/domain/stock-adjustment-modal';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-micro font-semibold uppercase tracking-wide text-ink-secondary">{label}</span>
      <span className="num text-2xl font-semibold text-ink">{value}</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-micro font-semibold uppercase tracking-wide text-ink-secondary">{label}</span>
      <span className="text-sm text-ink">{value ?? '—'}</span>
    </div>
  );
}

const TXN_LABEL: Record<string, string> = {
  PURCHASE_IN: 'Purchase In',
  JOB_CARD_CONSUMPTION: 'Job Card Consumption',
  SALE: 'Sale',
  RETURN: 'Return',
  ADJUSTMENT: 'Adjustment',
  DAMAGED: 'Damaged',
  TRANSFER: 'Transfer',
};

export default function PartDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const canUpdate = usePermission('part:update');
  const canDelete = usePermission('part:delete');
  const canReadLedger = usePermission('inventory:read');
  const canAdjustStock = usePermission('inventory:update');
  const canCreatePurchase = usePermission('purchase:create');

  const [ledgerPage, setLedgerPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);

  const query = useApiQuery<Part>(() => apiGet(`/parts/${params.id}`), [params.id]);
  const categories = useApiQuery<PartCategory[]>(() => apiGet('/part-categories'), []);
  const supplier = useApiQuery<Supplier>(
    () => (query.data?.supplierId ? apiGet(`/suppliers/${query.data.supplierId}`) : Promise.reject(new Error('n/a'))),
    [query.data?.supplierId],
  );
  const ledger = useApiQuery<PaginatedResult<InventoryTransactionEntry>>(
    () =>
      canReadLedger
        ? apiGet(`/parts/${params.id}/stock-ledger?page=${ledgerPage}&pageSize=15`)
        : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 15, totalPages: 0 }),
    [params.id, ledgerPage, canReadLedger],
  );

  async function handleDelete() {
    if (!window.confirm('Delete this part? This cannot be undone from here.')) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await apiDelete(`/parts/${params.id}`);
      router.push('/parts-inventory');
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

  const part = query.data;
  if (!part) return null;
  const status = derivePartStockStatus(part);
  const inventoryValue = Number(part.currentStock) * Number(part.purchasePrice);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-ink">{part.name}</h1>
            <StockStatusBadge status={status} />
            {!part.isActive ? <Badge tone="neutral">Inactive</Badge> : null}
          </div>
          <p className="num text-sm text-ink-secondary">
            {part.partNumber} · SKU: {part.sku}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/parts-inventory" className="self-center text-sm text-ink-secondary hover:text-ink">
            &larr; Back to parts
          </Link>
          {canUpdate ? (
            <Button variant="secondary" onClick={() => router.push(`/parts-inventory/${part.id}/edit`)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Edit
            </Button>
          ) : null}
          {canAdjustStock ? (
            <Button variant="secondary" onClick={() => setIsAdjustingStock(true)}>
              <Wrench className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Adjust Stock
            </Button>
          ) : null}
          {canCreatePurchase ? (
            <Button
              variant="secondary"
              onClick={() => router.push(`/purchases/new?partId=${part.id}${part.supplierId ? `&supplierId=${part.supplierId}` : ''}`)}
            >
              <ShoppingCart className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Create Purchase Order
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardBody className="py-4">
            <Stat label="Current Stock" value={formatQuantity(part.currentStock, part.unit)} />
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <Stat label="Minimum Stock" value={formatQuantity(part.minStock, part.unit)} />
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <Stat label="Maximum Stock" value={part.maxStock !== null ? formatQuantity(part.maxStock, part.unit) : '—'} />
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <Stat label="Selling Price" value={formatMoney(part.sellingPrice)} />
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <Stat label="Purchase Price" value={formatMoney(part.purchasePrice)} />
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <Stat label="Inventory Value" value={formatMoney(inventoryValue)} />
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-4">
            <Field label="Part Number" value={part.partNumber} />
            <Field label="SKU" value={part.sku} />
            <Field label="Name" value={part.name} />
            <Field label="Brand" value={part.brand} />
            <Field label="Category" value={categories.data?.find((c) => c.id === part.categoryId)?.name ?? null} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compatibility</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4">
            <Field label="Vehicle Compatibility" value={part.vehicleCompatibility} />
            <Field label="Warranty" value={part.warrantyPeriodMonths !== null ? `${part.warrantyPeriodMonths} months` : null} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supplier</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-4">
            <Field label="Preferred Supplier" value={supplier.data?.name ?? (part.supplierId ? '…' : null)} />
            <Field label="Contact" value={supplier.data?.mobile ?? null} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing & Tax</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-4">
            <Field label="Purchase Price" value={formatMoney(part.purchasePrice)} />
            <Field label="Selling Price" value={formatMoney(part.sellingPrice)} />
            <Field label="GST Rate" value={`${part.gstRate}%`} />
            <Field label="HSN Code" value={part.hsnCode} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-4">
            <Field label="Current Stock" value={formatQuantity(part.currentStock, part.unit)} />
            <Field label="Minimum Stock" value={formatQuantity(part.minStock, part.unit)} />
            <Field label="Maximum Stock" value={part.maxStock !== null ? formatQuantity(part.maxStock, part.unit) : null} />
            <Field label="Unit" value={part.unit} />
            <Field label="Bin Location" value={part.binLocation} />
          </CardBody>
        </Card>
      </div>

      {canReadLedger ? (
        <Card id="stock-history">
          <CardHeader>
            <CardTitle>Recent Stock Movements</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            {ledger.isLoading ? <Skeleton className="h-10 w-full" /> : null}
            {ledger.error ? <ErrorState message={ledger.error} onRetry={ledger.refetch} /> : null}
            {ledger.data && ledger.data.items.length === 0 ? (
              <p className="text-sm text-ink-muted">No stock movements yet.</p>
            ) : null}
            {ledger.data && ledger.data.items.length > 0 ? (
              <>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Date</TableHeaderCell>
                      <TableHeaderCell>Type</TableHeaderCell>
                      <TableHeaderCell>Quantity</TableHeaderCell>
                      <TableHeaderCell>Reference</TableHeaderCell>
                      <TableHeaderCell>User</TableHeaderCell>
                      <TableHeaderCell>Notes</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {ledger.data.items.map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell className="text-ink-secondary">{formatDate(txn.createdAt)}</TableCell>
                        <TableCell>{TXN_LABEL[txn.type] ?? txn.type}</TableCell>
                        <TableCell className={`num font-medium ${Number(txn.quantity) >= 0 ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}`}>
                          {Number(txn.quantity) >= 0 ? '+' : '-'}
                          {formatQuantity(Math.abs(Number(txn.quantity)), part.unit)}
                        </TableCell>
                        <TableCell className="text-ink-secondary">{txn.refType ?? '—'}</TableCell>
                        <TableCell className="text-ink-secondary">{txn.createdBy?.name ?? '—'}</TableCell>
                        <TableCell className="text-ink-secondary">{txn.notes ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination page={ledger.data.page} totalPages={ledger.data.totalPages} total={ledger.data.total} onPageChange={setLedgerPage} />
              </>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {isAdjustingStock ? (
        <StockAdjustmentModal
          part={part}
          onClose={() => setIsAdjustingStock(false)}
          onAdjusted={() => {
            query.refetch();
            ledger.refetch();
          }}
        />
      ) : null}
    </div>
  );
}
