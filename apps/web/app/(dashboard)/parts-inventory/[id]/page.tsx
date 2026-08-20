'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiDelete, apiGet, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { formatDate, formatMoney } from '@/lib/format';
import type { InventoryTransactionEntry, PaginatedResult, Part } from '@/lib/api-types';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

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

  const [ledgerPage, setLedgerPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const query = useApiQuery<Part>(() => apiGet(`/parts/${params.id}`), [params.id]);
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
  const isLow = part.currentStock <= part.minStock;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="num text-2xl font-semibold text-ink">{part.partNumber}</h1>
            <Badge tone={part.isActive ? 'success' : 'neutral'}>{part.isActive ? 'Active' : 'Inactive'}</Badge>
            {isLow ? <Badge tone="warning">Low Stock</Badge> : null}
          </div>
          <p className="text-sm text-ink-secondary">{part.name}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/parts-inventory" className="self-center text-sm text-ink-secondary hover:text-ink">
            &larr; Back to parts
          </Link>
          {canUpdate ? (
            <Button variant="secondary" onClick={() => router.push(`/parts-inventory/${part.id}/edit`)}>
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
            <CardTitle>Stock</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-4">
            <Field label="Current Stock" value={part.currentStock} />
            <Field label="Min / Max" value={`${part.minStock} / ${part.maxStock ?? '—'}`} />
            <Field label="Bin Location" value={part.binLocation} />
            <Field label="SKU" value={part.sku} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing & GST</CardTitle>
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
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-4">
            <Field label="Brand" value={part.brand} />
            <Field label="Warranty" value={part.warrantyPeriodMonths !== null ? `${part.warrantyPeriodMonths} months` : null} />
            <div className="col-span-2">
              <Field label="Vehicle Compatibility" value={part.vehicleCompatibility} />
            </div>
          </CardBody>
        </Card>
      </div>

      {canReadLedger ? (
        <Card>
          <CardHeader>
            <CardTitle>Stock Ledger</CardTitle>
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
                      <TableHeaderCell>Notes</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {ledger.data.items.map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell className="text-ink-secondary">{formatDate(txn.createdAt)}</TableCell>
                        <TableCell>{TXN_LABEL[txn.type] ?? txn.type}</TableCell>
                        <TableCell className={`num font-medium ${txn.quantity >= 0 ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}`}>
                          {txn.quantity >= 0 ? '+' : ''}
                          {txn.quantity}
                        </TableCell>
                        <TableCell className="text-ink-secondary">{txn.notes ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination
                  page={ledger.data.page}
                  totalPages={ledger.data.totalPages}
                  total={ledger.data.total}
                  onPageChange={setLedgerPage}
                />
              </>
            ) : null}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
