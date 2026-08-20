'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet, apiPatch, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { formatDate, formatMoney } from '@/lib/format';
import type { PurchaseOrderDetail, PurchaseOrderStatus } from '@/lib/api-types';
import { PurchaseOrderStatusBadge } from '@/components/domain/purchase-order-status-badge';
import { GoodsReceiptForm } from '@/components/domain/goods-receipt-form';
import { PurchaseInvoicesSection } from '@/components/domain/purchase-invoices-section';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const RECEIVABLE_STATUSES: PurchaseOrderStatus[] = ['SENT', 'PARTIALLY_RECEIVED'];

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const canUpdate = usePermission('purchase:update');
  const canCreatePurchaseInvoice = usePermission('purchase:create');

  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const query = useApiQuery<PurchaseOrderDetail>(() => apiGet(`/purchase-orders/${params.id}`), [params.id]);

  async function handleStatusChange(status: PurchaseOrderStatus) {
    if (status === 'CANCELLED' && !window.confirm('Cancel this purchase order?')) return;
    setIsChangingStatus(true);
    setActionError(null);
    try {
      await apiPatch(`/purchase-orders/${params.id}`, { status });
      query.refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsChangingStatus(false);
    }
  }

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.error) {
    return <ErrorState message={query.error} onRetry={query.refetch} />;
  }

  const po = query.data;
  if (!po) return null;

  const total = po.items.reduce((sum, i) => sum + Number(i.lineTotal), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="num text-2xl font-semibold text-ink">{po.poNumber}</h1>
            <PurchaseOrderStatusBadge status={po.status} />
          </div>
          <p className="text-sm text-ink-secondary">{po.supplier.name}</p>
        </div>
        <Link href="/purchases" className="self-center text-sm text-ink-secondary hover:text-ink">
          &larr; Back to purchase orders
        </Link>
      </div>

      {actionError ? <ErrorState message={actionError} /> : null}

      {canUpdate ? (
        <div className="flex flex-wrap gap-3">
          {po.status === 'DRAFT' ? (
            <Button onClick={() => handleStatusChange('SENT')} isLoading={isChangingStatus}>
              Send to Supplier
            </Button>
          ) : null}
          {(po.status === 'DRAFT' || po.status === 'SENT') ? (
            <Button variant="danger" onClick={() => handleStatusChange('CANCELLED')} isLoading={isChangingStatus}>
              Cancel Order
            </Button>
          ) : null}
        </div>
      ) : null}

      <Link
        href={`/suppliers/${po.supplier.id}`}
        className="flex w-fit flex-col gap-0.5 rounded-lg border border-line bg-surface px-4 py-3 shadow-card hover:border-accent-400"
      >
        <span className="text-sm font-medium text-ink">{po.supplier.name}</span>
        <span className="text-xs text-ink-muted">{po.supplier.mobile ?? po.supplier.email ?? ''}</span>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Part</TableHeaderCell>
                <TableHeaderCell>Ordered</TableHeaderCell>
                <TableHeaderCell>Received</TableHeaderCell>
                <TableHeaderCell>Unit Cost</TableHeaderCell>
                <TableHeaderCell>GST %</TableHeaderCell>
                <TableHeaderCell>Line Total</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {po.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.part.partNumber} <span className="text-ink-muted">— {item.part.name}</span>
                  </TableCell>
                  <TableCell className="num">{item.quantityOrdered}</TableCell>
                  <TableCell className="num">{item.quantityReceived}</TableCell>
                  <TableCell className="num">{formatMoney(item.unitCost)}</TableCell>
                  <TableCell className="num">{item.gstRate}%</TableCell>
                  <TableCell className="num font-medium">{formatMoney(item.lineTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="num text-right text-sm font-medium text-ink">Total (excl. GST): {formatMoney(total)}</p>
          {po.notes ? <p className="text-sm text-ink-secondary">{po.notes}</p> : null}
        </CardBody>
      </Card>

      {canUpdate && RECEIVABLE_STATUSES.includes(po.status) ? (
        <GoodsReceiptForm purchaseOrderId={po.id} items={po.items} onReceived={query.refetch} />
      ) : null}

      {po.goodsReceipts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Goods Receipts</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="flex flex-col divide-y divide-line">
              {po.goodsReceipts.map((receipt) => (
                <li key={receipt.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-ink">
                    {receipt.items.length} item{receipt.items.length === 1 ? '' : 's'} received
                    {receipt.notes ? <span className="text-ink-muted"> — {receipt.notes}</span> : null}
                  </span>
                  <span className="text-xs text-ink-muted">{formatDate(receipt.receivedAt)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <PurchaseInvoicesSection purchaseOrderId={po.id} canCreate={canCreatePurchaseInvoice} />
    </div>
  );
}
