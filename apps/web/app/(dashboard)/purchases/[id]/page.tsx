'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Printer, Pencil } from 'lucide-react';
import { apiGet, apiPatch, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { formatDate, formatMoney, formatQuantity } from '@/lib/format';
import { computePurchaseOrderProgress } from '@/lib/purchases/purchase-order-progress';
import type { PaginatedResult, PurchaseInvoice, PurchaseOrderDetail, PurchaseOrderStatus } from '@/lib/api-types';
import { PurchaseOrderStatusBadge } from '@/components/domain/purchase-order-status-badge';
import { PurchaseOrderActionsMenu } from '@/components/domain/purchase-order-actions-menu';
import { PurchaseOrderProgressStepper } from '@/components/domain/purchase-order-progress-stepper';
import { GoodsReceiptForm } from '@/components/domain/goods-receipt-form';
import { PurchaseInvoicesSection } from '@/components/domain/purchase-invoices-section';
import { KpiCard } from '@/components/domain/kpi-card';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const RECEIVABLE_STATUSES: PurchaseOrderStatus[] = ['SENT', 'PARTIALLY_RECEIVED'];

function Field({ label, value, emphasized }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-micro font-semibold uppercase tracking-wide text-ink-secondary">{label}</span>
      <span className={emphasized ? 'num text-base font-semibold text-ink' : 'num text-sm text-ink'}>{value}</span>
    </div>
  );
}

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const canUpdate = usePermission('purchase:update');
  const canCreatePurchaseInvoice = usePermission('purchase:create');

  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [draftExpectedDelivery, setDraftExpectedDelivery] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  const query = useApiQuery<PurchaseOrderDetail>(() => apiGet(`/purchase-orders/${params.id}`), [params.id]);
  const invoicesQuery = useApiQuery<PaginatedResult<PurchaseInvoice>>(
    () => apiGet(`/purchase-invoices?purchaseOrderId=${params.id}&pageSize=20`),
    [params.id],
  );

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

  function handleStartEditDetails() {
    if (!query.data) return;
    setDraftExpectedDelivery(query.data.expectedDeliveryDate ? query.data.expectedDeliveryDate.slice(0, 10) : '');
    setDraftNotes(query.data.notes ?? '');
    setIsEditingDetails(true);
  }

  async function handleSaveDetails() {
    setIsSavingDetails(true);
    setActionError(null);
    try {
      await apiPatch(`/purchase-orders/${params.id}`, {
        expectedDeliveryDate: draftExpectedDelivery || null,
        notes: draftNotes || null,
      });
      setIsEditingDetails(false);
      query.refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not save changes.');
    } finally {
      setIsSavingDetails(false);
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

  const invoices = invoicesQuery.data?.items ?? [];
  const progress = computePurchaseOrderProgress(po, invoices);

  const orderValue = po.items.reduce((sum, i) => sum + Number(i.lineTotal), 0);
  const receivedValue = po.items.reduce((sum, i) => sum + Number(i.quantityReceived) * Number(i.unitCost), 0);
  const outstandingValue = orderValue - receivedValue;
  const gstAmount = po.items.reduce((sum, i) => sum + (Number(i.lineTotal) * Number(i.gstRate)) / 100, 0);
  const grandTotal = orderValue + gstAmount;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="num text-2xl font-semibold text-ink">{po.poNumber}</h1>
            <PurchaseOrderStatusBadge status={po.status} />
          </div>
          <Link href={`/suppliers/${po.supplier.id}`} className="text-sm text-ink-secondary hover:text-accent-600">
            {po.supplier.name}
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/purchases" className="self-center text-sm text-ink-secondary hover:text-ink">
            &larr; Back to Purchase Orders
          </Link>
          {canUpdate ? (
            <Button variant="secondary" size="sm" onClick={handleStartEditDetails}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Edit
            </Button>
          ) : null}
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Print
          </Button>
          {canUpdate && po.status === 'DRAFT' ? (
            <Button size="sm" onClick={() => handleStatusChange('SENT')} isLoading={isChangingStatus}>
              Send to Supplier
            </Button>
          ) : null}
          <PurchaseOrderActionsMenu po={po} onChanged={query.refetch} onError={setActionError} />
        </div>
      </div>

      {actionError ? <ErrorState message={actionError} /> : null}

      {isEditingDetails ? (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>Edit Order Details</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <p className="text-xs text-ink-muted">Purchase order items are fixed after creation. Receiving is tracked separately.</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DatePicker label="Expected Delivery Date" value={draftExpectedDelivery} onChange={setDraftExpectedDelivery} />
            </div>
            <Textarea label="Notes" value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditingDetails(false)} disabled={isSavingDetails}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleSaveDetails} isLoading={isSavingDetails}>
                Save Changes
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Order Date" value={formatDate(po.createdAt)} tone="neutral" />
        <KpiCard label="Order Value" value={formatMoney(orderValue)} tone="fuchsia" />
        <KpiCard label="Received Value" value={formatMoney(receivedValue)} tone="teal" />
        <KpiCard label="Outstanding Value" value={formatMoney(outstandingValue)} tone={outstandingValue > 0 ? 'warning' : 'neutral'} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Order Date" value={formatDate(po.createdAt)} />
          <Field label="Expected Delivery" value={po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : '—'} />
          <Field label="Total Items" value={String(po.items.length)} />
          <Field label="Outstanding Value" value={formatMoney(outstandingValue)} emphasized />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order Progress</CardTitle>
        </CardHeader>
        <CardBody>
          <PurchaseOrderProgressStepper progress={progress} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Part</TableHeaderCell>
                <TableHeaderCell className="text-right">Ordered</TableHeaderCell>
                <TableHeaderCell className="text-right">Received</TableHeaderCell>
                <TableHeaderCell className="text-right">Pending</TableHeaderCell>
                <TableHeaderCell className="text-right">Unit Cost</TableHeaderCell>
                <TableHeaderCell className="text-right">GST %</TableHeaderCell>
                <TableHeaderCell className="text-right">Line Total</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {po.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <span className="font-medium text-ink">{item.part.partNumber}</span> <span className="text-ink-muted">— {item.part.name}</span>
                  </TableCell>
                  <TableCell className="num text-right">{formatQuantity(item.quantityOrdered, item.part.unit)}</TableCell>
                  <TableCell className="num text-right">{formatQuantity(item.quantityReceived, item.part.unit)}</TableCell>
                  <TableCell className="num text-right">{formatQuantity(Number(item.quantityOrdered) - Number(item.quantityReceived), item.part.unit)}</TableCell>
                  <TableCell className="num text-right">{formatMoney(item.unitCost)}</TableCell>
                  <TableCell className="num text-right">{item.gstRate}%</TableCell>
                  <TableCell className="num text-right font-medium">{formatMoney(item.lineTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="ml-auto flex w-full max-w-xs flex-col gap-1 text-sm">
            <div className="flex justify-between text-ink-secondary">
              <span>Subtotal</span>
              <span className="num">{formatMoney(orderValue)}</span>
            </div>
            <div className="flex justify-between text-ink-secondary">
              <span>GST</span>
              <span className="num">{formatMoney(gstAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-1 font-semibold text-ink">
              <span>Grand Total</span>
              <span className="num">{formatMoney(grandTotal)}</span>
            </div>
          </div>
          {po.notes ? <p className="text-sm text-ink-secondary">{po.notes}</p> : null}
        </CardBody>
      </Card>

      {canUpdate && RECEIVABLE_STATUSES.includes(po.status) ? (
        <GoodsReceiptForm purchaseOrderId={po.id} items={po.items} onReceived={query.refetch} />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Goods Receipts</CardTitle>
        </CardHeader>
        <CardBody>
          {po.goodsReceipts.length === 0 ? (
            <p className="text-sm text-ink-muted">No goods receipts recorded yet.</p>
          ) : (
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
          )}
        </CardBody>
      </Card>

      <PurchaseInvoicesSection
        purchaseOrderId={po.id}
        canCreate={canCreatePurchaseInvoice}
        invoices={invoices}
        isLoading={invoicesQuery.isLoading}
        error={invoicesQuery.error}
        onRetry={invoicesQuery.refetch}
        onRecorded={() => {
          invoicesQuery.refetch();
          query.refetch();
        }}
      />
    </div>
  );
}
