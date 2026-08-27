'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, List, LayoutGrid, Receipt, CheckCircle2, Hourglass, AlertTriangle, IndianRupee, ChevronDown, ChevronUp } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { useStaffOptions } from '@/lib/hooks/use-staff-options';
import { cn } from '@/lib/cn';
import type { InvoiceDisplayStatus, InvoiceListItem, InvoiceSummary, PaginatedResult } from '@/lib/api-types';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { exportRowsAsCsv } from '@/lib/export/csv';
import { InvoiceDisplayStatusBadge, INVOICE_DISPLAY_STATUS_LABEL } from '@/components/domain/invoice-display-status-badge';
import { InvoiceActionsMenu } from '@/components/domain/invoice-actions-menu';
import { NewInvoiceMenu } from '@/components/domain/new-invoice-menu';
import { KpiCard } from '@/components/domain/kpi-card';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const PAGE_SIZE = 10;
const TABS: (InvoiceDisplayStatus | 'ALL')[] = ['ALL', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'];
const TAB_LABEL: Record<(typeof TABS)[number], string> = {
  ALL: 'All Invoices',
  UNPAID: 'Unpaid',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
  REFUNDED: 'Refunded',
  OVERDUE: 'Overdue',
};

export default function InvoicesPage() {
  const staff = useStaffOptions();

  const [view, setView] = useState<'table' | 'list'>('table');
  const [tab, setTab] = useState<(typeof TABS)[number]>('ALL');
  const [search, setSearch] = useState('');
  const [serviceAdvisorId, setServiceAdvisorId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [actionError, setActionError] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const summary = useApiQuery<InvoiceSummary>(() => apiGet('/invoices/summary'), []);

  const query = useApiQuery<PaginatedResult<InvoiceListItem>>(
    () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (tab !== 'ALL') params.set('displayStatus', tab);
      if (serviceAdvisorId) params.set('serviceAdvisorId', serviceAdvisorId);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (minAmount) params.set('minAmount', minAmount);
      if (maxAmount) params.set('maxAmount', maxAmount);
      return apiGet(`/invoices?${params.toString()}`);
    },
    [page, pageSize, debouncedSearch, tab, serviceAdvisorId, from, to, minAmount, maxAmount],
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleReset() {
    setSearch('');
    setTab('ALL');
    setServiceAdvisorId('');
    setFrom('');
    setTo('');
    setMinAmount('');
    setMaxAmount('');
    setPage(1);
  }

  function handleTabChange(next: (typeof TABS)[number]) {
    setTab(next);
    setPage(1);
  }

  function handleKpiClick(next: (typeof TABS)[number]) {
    setTab((current) => (current === next ? 'ALL' : next));
    setPage(1);
  }

  function handleExport() {
    if (!query.data) return;
    const columns = [
      { key: 'invoiceNumber', label: 'Invoice #' },
      { key: 'customer', label: 'Customer' },
      { key: 'vehicle', label: 'Vehicle' },
      { key: 'date', label: 'Date' },
      { key: 'jobCard', label: 'Job Card' },
      { key: 'grandTotal', label: 'Grand Total' },
      { key: 'paidAmount', label: 'Paid Amount' },
      { key: 'dueAmount', label: 'Due Amount' },
      { key: 'status', label: 'Status' },
    ];
    const rows = query.data.items.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      customer: inv.customer.name,
      vehicle: inv.jobCard ? `${inv.jobCard.vehicle.registrationNo} — ${inv.jobCard.vehicle.brand} ${inv.jobCard.vehicle.model}` : '—',
      date: formatDate(inv.createdAt),
      jobCard: inv.jobCard?.jobCardNumber ?? '—',
      grandTotal: inv.grandTotal,
      paidAmount: inv.paidAmount,
      dueAmount: inv.dueAmount,
      status: INVOICE_DISPLAY_STATUS_LABEL[inv.displayStatus],
    }));
    exportRowsAsCsv(columns, rows, `invoices-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  const hasActiveFilters = Boolean(debouncedSearch || serviceAdvisorId || from || to || minAmount || maxAmount || tab !== 'ALL');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Invoices</h1>
          <p className="text-sm text-ink-secondary">Manage all workshop invoices, payments and outstanding amounts.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleExport} disabled={!query.data}>
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Export
          </Button>
          <NewInvoiceMenu />
        </div>
      </div>

      {summary.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : null}
      {summary.error ? <ErrorState message={summary.error} onRetry={summary.refetch} /> : null}
      {summary.data ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="Total Invoices" value={formatNumber(summary.data.totalInvoicesThisMonth)} sublabel="This Month" tone="neutral" icon={<Receipt className="h-4 w-4" />} />
          <button type="button" onClick={() => handleKpiClick('PAID')} className="text-left">
            <KpiCard label="Paid" value={formatNumber(summary.data.paid.count)} sublabel={formatMoney(summary.data.paid.amount)} tone="teal" icon={<CheckCircle2 className="h-4 w-4" />} />
          </button>
          <button type="button" onClick={() => handleKpiClick('UNPAID')} className="text-left">
            <KpiCard label="Unpaid" value={formatNumber(summary.data.unpaid.count)} sublabel={formatMoney(summary.data.unpaid.amount)} tone="warning" icon={<Hourglass className="h-4 w-4" />} />
          </button>
          <button type="button" onClick={() => handleKpiClick('OVERDUE')} className="text-left">
            <KpiCard label="Overdue" value={formatNumber(summary.data.overdue.count)} sublabel={formatMoney(summary.data.overdue.amount)} tone="danger" icon={<AlertTriangle className="h-4 w-4" />} />
          </button>
          <KpiCard label="Total Revenue" value={formatMoney(summary.data.totalRevenueThisMonth)} sublabel="This Month" tone="fuchsia" icon={<IndianRupee className="h-4 w-4" />} />
        </div>
      ) : null}

      {summary.data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Aging Summary</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-2">
              <AgingRow label="0 – 30 days" value={summary.data.aging.d0to30} />
              <AgingRow label="31 – 60 days" value={summary.data.aging.d31to60} />
              <AgingRow label="60+ days" value={summary.data.aging.d60plus} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recently Paid</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-3">
              {summary.data.recentlyPaid.length === 0 ? (
                <p className="text-xs text-ink-muted">No payments recorded yet.</p>
              ) : (
                summary.data.recentlyPaid.slice(0, 3).map((p) => (
                  <Link key={p.id} href={`/invoices/${p.invoiceId}`} className="flex items-center justify-between text-xs hover:text-accent-600">
                    <div>
                      <p className="num font-medium text-ink">{p.invoiceNumber}</p>
                      <p className="text-ink-muted">{p.customerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="num font-medium text-success-600 dark:text-success-400">{formatMoney(p.amount)}</p>
                      <p className="text-ink-muted">{formatDate(p.paymentDate)}</p>
                    </div>
                  </Link>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Overdue Invoices</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-3">
              {summary.data.overdueList.length === 0 ? (
                <p className="text-xs text-ink-muted">You&rsquo;re all caught up — no overdue invoices at the moment.</p>
              ) : (
                summary.data.overdueList.slice(0, 3).map((o) => (
                  <Link key={o.id} href={`/invoices/${o.id}`} className="flex items-center justify-between text-xs hover:text-accent-600">
                    <div>
                      <p className="num font-medium text-ink">{o.invoiceNumber}</p>
                      <p className="text-ink-muted">{o.customerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="num font-medium text-danger-600 dark:text-danger-400">{formatMoney(o.dueAmount)}</p>
                      <p className="text-ink-muted">{o.overdueDays}d overdue</p>
                    </div>
                  </Link>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Paying Customers</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-2">
              {summary.data.topPayingCustomers.length === 0 ? (
                <p className="text-xs text-ink-muted">No payments this month yet.</p>
              ) : (
                summary.data.topPayingCustomers.map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <span className="text-ink-secondary">{c.name}</span>
                    <span className="num font-medium text-ink">{formatMoney(c.amount)}</span>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardBody className="flex flex-col gap-3 pt-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="max-w-sm flex-1">
              <Input value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search by invoice number, customer, vehicle…" aria-label="Search invoices" />
            </div>
            {staff.isAvailable ? (
              <div className="w-44">
                <Select value={serviceAdvisorId} onChange={(e) => { setServiceAdvisorId(e.target.value); setPage(1); }} aria-label="Filter by advisor">
                  <option value="">All Advisors</option>
                  {staff.options.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            <Input label="From Date" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="w-40" />
            <Input label="To Date" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="w-40" />
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowMoreFilters((v) => !v)}>
              More Filters
              {showMoreFilters ? <ChevronUp className="ml-1.5 h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="ml-1.5 h-3.5 w-3.5" aria-hidden />}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={handleReset} disabled={!hasActiveFilters}>
              Clear Filters
            </Button>

            <div className="ml-auto flex rounded border border-line bg-surface p-0.5">
              <button
                type="button"
                onClick={() => setView('table')}
                aria-pressed={view === 'table'}
                className={cn('flex h-8 items-center gap-1.5 rounded px-3 text-xs font-medium transition-colors', view === 'table' ? 'bg-accent-500 text-white' : 'text-ink-secondary hover:bg-surface-hover')}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                Table
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                aria-pressed={view === 'list'}
                className={cn('flex h-8 items-center gap-1.5 rounded px-3 text-xs font-medium transition-colors', view === 'list' ? 'bg-accent-500 text-white' : 'text-ink-secondary hover:bg-surface-hover')}
              >
                <List className="h-3.5 w-3.5" aria-hidden />
                List
              </button>
            </div>
          </div>

          {showMoreFilters ? (
            <div className="flex flex-wrap items-end gap-3 border-t border-line pt-3">
              <Input label="Min Amount (₹)" type="number" min={0} value={minAmount} onChange={(e) => { setMinAmount(e.target.value); setPage(1); }} className="w-36" />
              <Input label="Max Amount (₹)" type="number" min={0} value={maxAmount} onChange={(e) => { setMaxAmount(e.target.value); setPage(1); }} className="w-36" />
            </div>
          ) : null}
        </CardBody>
      </Card>

      <div className="flex flex-wrap gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleTabChange(t)}
            aria-pressed={tab === t}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors',
              tab === t ? 'bg-accent-500 text-white' : 'text-ink-secondary hover:bg-surface-hover',
            )}
          >
            {TAB_LABEL[t]}
            {t === 'ALL' && summary.data ? (
              <span className={cn('num rounded-full px-1.5 py-0.5 text-micro', tab === t ? 'bg-white/20' : 'bg-surface-hover')}>
                {summary.data.paid.count + summary.data.unpaid.count}
              </span>
            ) : null}
            {t === 'PAID' && summary.data ? <span className={cn('num rounded-full px-1.5 py-0.5 text-micro', tab === t ? 'bg-white/20' : 'bg-surface-hover')}>{summary.data.paid.count}</span> : null}
            {t === 'UNPAID' && summary.data ? <span className={cn('num rounded-full px-1.5 py-0.5 text-micro', tab === t ? 'bg-white/20' : 'bg-surface-hover')}>{summary.data.unpaid.count}</span> : null}
            {t === 'OVERDUE' && summary.data ? <span className={cn('num rounded-full px-1.5 py-0.5 text-micro', tab === t ? 'bg-white/20' : 'bg-surface-hover')}>{summary.data.overdue.count}</span> : null}
          </button>
        ))}
      </div>

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
          <Receipt className="h-8 w-8 text-ink-muted" aria-hidden />
          <div>
            <p className="text-sm font-medium text-ink">No invoices found</p>
            <p className="text-xs text-ink-muted">Try changing your filters or create an invoice from a completed job card.</p>
          </div>
          <Link href="/job-cards?status=READY_FOR_DELIVERY">
            <Button type="button" size="sm">
              View Completed Job Cards
            </Button>
          </Link>
        </div>
      ) : null}

      {query.data && query.data.items.length === 0 && hasActiveFilters ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-5 py-14 text-center">
          <Receipt className="h-8 w-8 text-ink-muted" aria-hidden />
          <div>
            <p className="text-sm font-medium text-ink">No invoices found</p>
            <p className="text-xs text-ink-muted">Try changing your search or filters.</p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={handleReset}>
            Clear Filters
          </Button>
        </div>
      ) : null}

      {query.data && query.data.items.length > 0 && view === 'table' ? (
        <div className="flex flex-col gap-3">
          <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface shadow-card sm:block">
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Invoice #</TableHeaderCell>
                  <TableHeaderCell>Customer / Vehicle</TableHeaderCell>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Job Card</TableHeaderCell>
                  <TableHeaderCell className="text-right">Grand Total</TableHeaderCell>
                  <TableHeaderCell className="text-right">Paid Amount</TableHeaderCell>
                  <TableHeaderCell className="text-right">Due Amount</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {query.data.items.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="num font-semibold">
                      <Link href={`/invoices/${invoice.id}`} className="text-ink hover:text-accent-600">
                        {invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="text-ink">{invoice.customer.name}</p>
                      {invoice.jobCard ? (
                        <p className="num text-xs text-ink-muted">
                          {invoice.jobCard.vehicle.registrationNo} · {invoice.jobCard.vehicle.brand} {invoice.jobCard.vehicle.model}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-ink-secondary">{formatDate(invoice.createdAt)}</TableCell>
                    <TableCell className="num text-ink-secondary">{invoice.jobCard?.jobCardNumber ?? '—'}</TableCell>
                    <TableCell className="num text-right font-medium text-ink">{formatMoney(invoice.grandTotal)}</TableCell>
                    <TableCell className="num text-right text-success-600 dark:text-success-400">{formatMoney(invoice.paidAmount)}</TableCell>
                    <TableCell className={cn('num text-right', Number(invoice.dueAmount) > 0 ? 'font-medium text-danger-600 dark:text-danger-400' : 'text-ink-muted')}>
                      {formatMoney(invoice.dueAmount)}
                    </TableCell>
                    <TableCell>
                      <InvoiceDisplayStatusBadge status={invoice.displayStatus} />
                    </TableCell>
                    <TableCell>
                      <InvoiceActionsMenu invoice={invoice} onError={setActionError} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile card list — same compact layout as the List view below */}
          <div className="flex flex-col gap-3 sm:hidden">
            {query.data.items.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} onError={setActionError} />
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

      {query.data && query.data.items.length > 0 && view === 'list' ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.items.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} onError={setActionError} />
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

function AgingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-secondary">{label}</span>
      <span className="num font-medium text-ink">{formatMoney(value)}</span>
    </div>
  );
}

function InvoiceCard({ invoice, onError }: { invoice: InvoiceListItem; onError: (message: string) => void }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface p-3 shadow-panel">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href={`/invoices/${invoice.id}`} className="num text-sm font-semibold text-ink hover:text-accent-600">
            {invoice.invoiceNumber}
          </Link>
          <p className="text-xs text-ink-secondary">{invoice.customer.name}</p>
          {invoice.jobCard ? (
            <p className="num text-xs text-ink-muted">
              {invoice.jobCard.vehicle.registrationNo} · {invoice.jobCard.vehicle.brand} {invoice.jobCard.vehicle.model}
            </p>
          ) : null}
        </div>
        <InvoiceDisplayStatusBadge status={invoice.displayStatus} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="num font-medium text-ink">{formatMoney(invoice.grandTotal)}</span>
        <span className={cn('num text-xs', Number(invoice.dueAmount) > 0 ? 'font-medium text-danger-600 dark:text-danger-400' : 'text-ink-muted')}>
          Due {formatMoney(invoice.dueAmount)}
        </span>
      </div>
      <div className="flex items-center justify-between border-t border-line pt-2">
        <span className="text-xs text-ink-muted">{formatDate(invoice.createdAt)}</span>
        <InvoiceActionsMenu invoice={invoice} onError={onError} />
      </div>
    </div>
  );
}
