'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, Plus, ClipboardList, PackageCheck, Clock, XCircle, IndianRupee, PackageOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { usePermission } from '@/lib/hooks/use-permission';
import type { PaginatedResult, PurchaseOrderBucket, PurchaseOrderListItem, PurchaseOrderStatus, PurchaseOrderSummary, Supplier } from '@/lib/api-types';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { exportRowsAsCsv } from '@/lib/export/csv';
import { PurchaseOrderStatusBadge, PURCHASE_ORDER_STATUS_LABEL } from '@/components/domain/purchase-order-status-badge';
import { PurchaseOrderActionsMenu } from '@/components/domain/purchase-order-actions-menu';
import { KpiCard } from '@/components/domain/kpi-card';
import { Card, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const PAGE_SIZE = 10;
const STATUSES: PurchaseOrderStatus[] = ['DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'];

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canCreate = usePermission('purchase:create');

  const preselectedSupplierId = searchParams.get('supplierId');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PurchaseOrderStatus | ''>('');
  const [bucket, setBucket] = useState<PurchaseOrderBucket | ''>('');
  const [supplierId, setSupplierId] = useState(preselectedSupplierId ?? '');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expectedFrom, setExpectedFrom] = useState('');
  const [expectedTo, setExpectedTo] = useState('');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [actionError, setActionError] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const suppliers = useApiQuery<PaginatedResult<Supplier>>(() => apiGet('/suppliers?pageSize=100'), []);
  const summary = useApiQuery<PurchaseOrderSummary>(() => apiGet('/purchase-orders/summary'), []);

  const query = useApiQuery<PaginatedResult<PurchaseOrderListItem>>(
    () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (status) params.set('status', status);
      if (!status && bucket) params.set('bucket', bucket);
      if (supplierId) params.set('supplierId', supplierId);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (expectedFrom) params.set('expectedFrom', expectedFrom);
      if (expectedTo) params.set('expectedTo', expectedTo);
      if (minValue) params.set('minValue', minValue);
      if (maxValue) params.set('maxValue', maxValue);
      return apiGet(`/purchase-orders?${params.toString()}`);
    },
    [page, pageSize, debouncedSearch, status, bucket, supplierId, from, to, expectedFrom, expectedTo, minValue, maxValue],
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(value: string) {
    setStatus(value as PurchaseOrderStatus | '');
    setBucket('');
    setPage(1);
  }

  function handleSupplierChange(value: string) {
    setSupplierId(value);
    setPage(1);
  }

  function handleKpiClick(next: PurchaseOrderBucket) {
    setBucket((current) => (current === next ? '' : next));
    setStatus('');
    setPage(1);
  }

  function handleReset() {
    setSearch('');
    setStatus('');
    setBucket('');
    setSupplierId('');
    setFrom('');
    setTo('');
    setExpectedFrom('');
    setExpectedTo('');
    setMinValue('');
    setMaxValue('');
    setPage(1);
  }

  function handleExport() {
    if (!query.data) return;
    const columns = [
      { key: 'poNumber', label: 'PO Number' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'orderDate', label: 'Order Date' },
      { key: 'expectedDelivery', label: 'Expected Delivery' },
      { key: 'orderValue', label: 'Order Value' },
      { key: 'status', label: 'Status' },
    ];
    const rows = query.data.items.map((po) => ({
      poNumber: po.poNumber,
      supplier: po.supplier.name,
      orderDate: formatDate(po.createdAt),
      expectedDelivery: po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : '—',
      orderValue: po.totalAmount,
      status: PURCHASE_ORDER_STATUS_LABEL[po.status],
    }));
    exportRowsAsCsv(columns, rows, `purchase-orders-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  const hasActiveFilters = Boolean(
    debouncedSearch || status || bucket || supplierId || from || to || expectedFrom || expectedTo || minValue || maxValue,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Purchase Orders</h1>
          <p className="text-sm text-ink-secondary">Purchase Order → Goods Received → Purchase Invoice → Supplier Payment</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleExport} disabled={!query.data}>
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Export
          </Button>
          {canCreate ? (
            <Button type="button" size="sm" onClick={() => router.push('/purchases/new')}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              New Purchase Order
            </Button>
          ) : null}
        </div>
      </div>

      {summary.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : null}
      {summary.error ? <ErrorState message={summary.error} onRetry={summary.refetch} /> : null}
      {summary.data ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Total POs" value={formatNumber(summary.data.total)} sublabel="All Time" tone="neutral" icon={<ClipboardList className="h-4 w-4" />} />
          <button type="button" onClick={() => handleKpiClick('received')} className="text-left">
            <KpiCard label="Received" value={formatNumber(summary.data.received)} sublabel="Fully / Partially" tone="teal" icon={<PackageCheck className="h-4 w-4" />} />
          </button>
          <button type="button" onClick={() => handleKpiClick('pending')} className="text-left">
            <KpiCard label="Pending" value={formatNumber(summary.data.pending)} sublabel="Awaiting Delivery" tone="warning" icon={<Clock className="h-4 w-4" />} />
          </button>
          <button type="button" onClick={() => handleKpiClick('cancelled')} className="text-left">
            <KpiCard label="Cancelled" value={formatNumber(summary.data.cancelled)} sublabel="Cancelled Orders" tone="danger" icon={<XCircle className="h-4 w-4" />} />
          </button>
          <KpiCard label="Total Order Value" value={formatMoney(summary.data.totalOrderValue)} sublabel="All Time" tone="fuchsia" icon={<IndianRupee className="h-4 w-4" />} />
          <KpiCard label="Total Received Value" value={formatMoney(summary.data.totalReceivedValue)} sublabel="All Time" tone="blue" icon={<PackageOpen className="h-4 w-4" />} />
        </div>
      ) : null}

      <Card>
        <CardBody className="flex flex-col gap-3 pt-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="max-w-sm flex-1">
              <Input value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search by PO number…" aria-label="Search purchase orders" />
            </div>
            <div className="w-52">
              <Select value={status} onChange={(e) => handleStatusChange(e.target.value)} aria-label="Filter by status">
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PURCHASE_ORDER_STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </div>
            {suppliers.data ? (
              <div className="w-56">
                <Select value={supplierId} onChange={(e) => handleSupplierChange(e.target.value)} aria-label="Filter by supplier">
                  <option value="">All suppliers</option>
                  {suppliers.data.items.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowMoreFilters((v) => !v)}>
              More Filters
              {showMoreFilters ? <ChevronUp className="ml-1.5 h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="ml-1.5 h-3.5 w-3.5" aria-hidden />}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={handleReset} disabled={!hasActiveFilters}>
              Reset
            </Button>
          </div>

          {showMoreFilters ? (
            <div className="flex flex-wrap items-end gap-3 border-t border-line pt-3">
              <Input label="Order Date From" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="w-40" />
              <Input label="Order Date To" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="w-40" />
              <Input label="Expected From" type="date" value={expectedFrom} onChange={(e) => { setExpectedFrom(e.target.value); setPage(1); }} className="w-40" />
              <Input label="Expected To" type="date" value={expectedTo} onChange={(e) => { setExpectedTo(e.target.value); setPage(1); }} className="w-40" />
              <Input label="Min Value (₹)" type="number" min={0} value={minValue} onChange={(e) => { setMinValue(e.target.value); setPage(1); }} className="w-36" />
              <Input label="Max Value (₹)" type="number" min={0} value={maxValue} onChange={(e) => { setMaxValue(e.target.value); setPage(1); }} className="w-36" />
            </div>
          ) : null}
        </CardBody>
      </Card>

      {actionError ? (
        <p role="alert" className="rounded border border-danger-100 bg-danger-50 px-3 py-2 text-xs text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400">
          {actionError}
        </p>
      ) : null}

      {query.isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}

      {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}

      {query.data && query.data.items.length === 0 && !hasActiveFilters ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-5 py-14 text-center">
          <ClipboardList className="h-8 w-8 text-ink-muted" aria-hidden />
          <div>
            <p className="text-sm font-medium text-ink">No purchase orders yet</p>
            <p className="text-xs text-ink-muted">Create your first purchase order to start ordering parts from a supplier.</p>
          </div>
          {canCreate ? (
            <Button type="button" size="sm" onClick={() => router.push('/purchases/new')}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              New Purchase Order
            </Button>
          ) : null}
        </div>
      ) : null}

      {query.data && query.data.items.length === 0 && hasActiveFilters ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-5 py-14 text-center">
          <ClipboardList className="h-8 w-8 text-ink-muted" aria-hidden />
          <div>
            <p className="text-sm font-medium text-ink">No purchase orders found</p>
            <p className="text-xs text-ink-muted">Try changing your search or filters.</p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={handleReset}>
            Clear Filters
          </Button>
        </div>
      ) : null}

      {query.data && query.data.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface shadow-card sm:block">
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>PO Number</TableHeaderCell>
                  <TableHeaderCell>Supplier</TableHeaderCell>
                  <TableHeaderCell>Order Date</TableHeaderCell>
                  <TableHeaderCell>Expected Delivery</TableHeaderCell>
                  <TableHeaderCell className="text-right">Order Value</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {query.data.items.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="num font-semibold">
                      <Link href={`/purchases/${po.id}`} className="text-ink hover:text-accent-600">
                        {po.poNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium text-ink">{po.supplier.name}</TableCell>
                    <TableCell className="text-ink-secondary">{formatDate(po.createdAt)}</TableCell>
                    <TableCell className="text-ink-secondary">{po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : '—'}</TableCell>
                    <TableCell className="num text-right font-medium text-ink">{formatMoney(po.totalAmount)}</TableCell>
                    <TableCell>
                      <PurchaseOrderStatusBadge status={po.status} />
                    </TableCell>
                    <TableCell>
                      <PurchaseOrderActionsMenu po={po} onChanged={query.refetch} onError={setActionError} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:hidden">
            {query.data.items.map((po) => (
              <PurchaseOrderCard key={po.id} po={po} onChanged={query.refetch} onError={setActionError} />
            ))}
          </div>

          <Pagination
            page={query.data.page}
            totalPages={query.data.totalPages}
            total={query.data.total}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function PurchaseOrderCard({ po, onChanged, onError }: { po: PurchaseOrderListItem; onChanged: () => void; onError: (message: string) => void }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface p-3 shadow-panel">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href={`/purchases/${po.id}`} className="num text-sm font-semibold text-ink hover:text-accent-600">
            {po.poNumber}
          </Link>
          <p className="text-xs text-ink-secondary">{po.supplier.name}</p>
        </div>
        <PurchaseOrderStatusBadge status={po.status} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="num font-medium text-ink">{formatMoney(po.totalAmount)}</span>
        <span className="text-xs text-ink-secondary">{po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : 'No delivery date'}</span>
      </div>
      <div className="flex items-center justify-between border-t border-line pt-2">
        <span className="text-xs text-ink-muted">Ordered {formatDate(po.createdAt)}</span>
        <PurchaseOrderActionsMenu po={po} onChanged={onChanged} onError={onError} />
      </div>
    </div>
  );
}
