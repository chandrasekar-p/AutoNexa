'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Car, Download, Eye, Plus } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { usePermission } from '@/lib/hooks/use-permission';
import { exportRowsAsCsv } from '@/lib/export/csv';
import type { EstimateApprovalStatus, EstimateListItem, EstimateSummary, PaginatedResult } from '@/lib/api-types';
import { formatDate, formatMoney, formatNumber, formatTime } from '@/lib/format';
import { KpiCard } from '@/components/domain/kpi-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';
import { cn } from '@/lib/cn';

const DEFAULT_PAGE_SIZE = 10;

const APPROVAL_STATUS_LABEL: Record<EstimateApprovalStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  AWAITING_APPROVAL: 'Awaiting Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  CONVERTED: 'Converted',
};

const APPROVAL_STATUS_TONE: Record<EstimateApprovalStatus, 'neutral' | 'accent' | 'warning' | 'success' | 'danger'> = {
  DRAFT: 'neutral',
  SENT: 'accent',
  AWAITING_APPROVAL: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'danger',
  CONVERTED: 'success',
};

// 'All' first, then every real/derived status a pill can filter on — same
// order APPROVAL_STATUS_LABEL/TONE are keyed by, so the pill row and the
// status Select below always offer the same set.
const PILL_VALUES: (EstimateApprovalStatus | 'ALL')[] = ['ALL', 'DRAFT', 'SENT', 'AWAITING_APPROVAL', 'APPROVED', 'REJECTED', 'CONVERTED', 'EXPIRED'];

function summaryCount(summary: EstimateSummary, value: EstimateApprovalStatus | 'ALL'): number {
  switch (value) {
    case 'ALL':
      return summary.total;
    case 'DRAFT':
      return summary.draft;
    case 'SENT':
      return summary.sent;
    case 'AWAITING_APPROVAL':
      return summary.awaitingApproval;
    case 'APPROVED':
      return summary.approved;
    case 'REJECTED':
      return summary.rejected;
    case 'EXPIRED':
      return summary.expired;
    case 'CONVERTED':
      return summary.converted;
  }
}

export default function EstimatesPage() {
  const canCreate = usePermission('estimate:create');

  const [search, setSearch] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<EstimateApprovalStatus | 'ALL'>('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const debouncedSearch = useDebouncedValue(search);

  const summary = useApiQuery<EstimateSummary>(() => apiGet('/estimates/summary'), []);

  const query = useApiQuery<PaginatedResult<EstimateListItem>>(
    () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (approvalStatus !== 'ALL') params.set('approvalStatus', approvalStatus);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      return apiGet(`/estimates?${params.toString()}`);
    },
    [page, pageSize, debouncedSearch, approvalStatus, from, to],
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handlePillClick(value: EstimateApprovalStatus | 'ALL') {
    setApprovalStatus(value);
    setPage(1);
  }

  function handleReset() {
    setSearch('');
    setApprovalStatus('ALL');
    setFrom('');
    setTo('');
    setPage(1);
  }

  function handleExportCsv() {
    if (!query.data) return;
    const columns = [
      { key: 'estimateNumber', label: 'Estimate No.' },
      { key: 'linkedInvoiceNumber', label: 'Invoice No.' },
      { key: 'customerName', label: 'Customer' },
      { key: 'vehicle', label: 'Vehicle' },
      { key: 'jobDescription', label: 'Job / Description' },
      { key: 'total', label: 'Amount' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Created On' },
    ];
    const rows = query.data.items.map((e) => ({
      estimateNumber: e.estimateNumber ?? '—',
      linkedInvoiceNumber: e.linkedInvoiceNumber ?? '—',
      customerName: e.customerName,
      vehicle: `${e.vehicleRegistrationNo} ${e.vehicleBrand} ${e.vehicleModel}`,
      jobDescription: e.jobDescription ?? '—',
      total: formatMoney(e.total),
      status: APPROVAL_STATUS_LABEL[e.approvalStatus],
      createdAt: `${formatDate(e.createdAt)} ${formatTime(e.createdAt)}`,
    }));
    exportRowsAsCsv(columns, rows, `estimates-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Estimates</h1>
          <p className="text-sm text-ink-secondary">Manage estimates and customer approvals.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleExportCsv} disabled={!query.data}>
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Export
          </Button>
          {canCreate ? (
            <Link href="/estimates/new">
              <Button type="button" size="sm">
                <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                New Estimate
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      {summary.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : null}
      {summary.error ? <ErrorState message={summary.error} onRetry={summary.refetch} /> : null}
      {summary.data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Total Estimates" value={formatNumber(summary.data.total)} sublabel="All time" tone="accent" />
          <KpiCard
            label="Draft"
            value={formatNumber(summary.data.draft)}
            sublabel={summary.data.total > 0 ? `${((summary.data.draft / summary.data.total) * 100).toFixed(1)}% of total` : undefined}
            tone="neutral"
          />
          <KpiCard
            label="Sent"
            value={formatNumber(summary.data.sent)}
            sublabel={summary.data.total > 0 ? `${((summary.data.sent / summary.data.total) * 100).toFixed(1)}% of total` : undefined}
            tone="blue"
          />
          <KpiCard
            label="Awaiting Approval"
            value={formatNumber(summary.data.awaitingApproval)}
            sublabel={summary.data.total > 0 ? `${((summary.data.awaitingApproval / summary.data.total) * 100).toFixed(1)}% of total` : undefined}
            tone="warning"
          />
          <KpiCard
            label="Converted"
            value={formatNumber(summary.data.converted)}
            sublabel={summary.data.total > 0 ? `${((summary.data.converted / summary.data.total) * 100).toFixed(1)}% of total` : undefined}
            tone="teal"
          />
          <KpiCard label="Total Estimate Value" value={formatMoney(summary.data.totalValue)} sublabel="All time" tone="fuchsia" />
        </div>
      ) : null}

      {summary.data && summary.data.awaitingApproval > 0 ? (
        <Card className="border-accent-200 bg-accent-50 dark:border-accent-500/30 dark:bg-accent-500/10">
          <CardBody className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-600 dark:bg-accent-500/20 dark:text-accent-400">
                <Bell className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-medium text-ink">
                  {formatNumber(summary.data.awaitingApproval)} estimate{summary.data.awaitingApproval === 1 ? '' : 's'} awaiting customer approval
                </p>
              </div>
            </div>
            <Button type="button" size="sm" onClick={() => handlePillClick('AWAITING_APPROVAL')}>
              View Pending Approvals →
            </Button>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody className="flex flex-col gap-4 pt-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="max-w-sm flex-1">
              <Input
                label="Search"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search customer, vehicle, estimate no., or job…"
                aria-label="Search estimates"
              />
            </div>
            <div className="w-52">
              <Select
                label="Status"
                value={approvalStatus}
                onChange={(e) => handlePillClick(e.target.value as EstimateApprovalStatus | 'ALL')}
                aria-label="Filter by status"
              >
                <option value="ALL">All Statuses</option>
                {PILL_VALUES.filter((v): v is EstimateApprovalStatus => v !== 'ALL').map((s) => (
                  <option key={s} value={s}>
                    {APPROVAL_STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </div>
            <Input label="From" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="w-40" />
            <Input label="To" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="w-40" />
            <Button type="button" variant="secondary" size="sm" onClick={handleReset}>
              Reset
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {PILL_VALUES.map((value) => {
              const isActive = value === approvalStatus;
              const count = summary.data ? summaryCount(summary.data, value) : null;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handlePillClick(value)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                    isActive
                      ? 'border-accent-400 bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-400'
                      : 'border-line text-ink-secondary hover:bg-surface-hover',
                  )}
                >
                  {value === 'ALL' ? 'All' : APPROVAL_STATUS_LABEL[value]}
                  {count !== null ? <span className="num">{count}</span> : null}
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {query.isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}

      {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}

      {query.data && query.data.items.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface px-5 py-10 text-center text-sm text-ink-muted">
          No estimates match those filters.
        </p>
      ) : null}

      {query.data && query.data.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-line bg-surface shadow-card">
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Estimate No.</TableHeaderCell>
                  <TableHeaderCell>Customer & Vehicle</TableHeaderCell>
                  <TableHeaderCell>Job / Description</TableHeaderCell>
                  <TableHeaderCell>Amount</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Created On</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {query.data.items.map((estimate) => (
                  <TableRow key={estimate.id}>
                    <TableCell>
                      <Link href={`/estimates/${estimate.id}`} className="font-medium text-ink hover:text-accent-600">
                        {estimate.estimateNumber ?? '—'}
                      </Link>
                      {estimate.linkedInvoiceNumber ? (
                        <p className="text-xs text-ink-muted">{estimate.linkedInvoiceNumber}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-hover text-ink-secondary">
                          <Car className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        <div>
                          <p className="text-ink">{estimate.customerName}</p>
                          <p className="text-xs text-ink-muted">
                            {estimate.vehicleBrand} {estimate.vehicleModel} ({estimate.vehicleRegistrationNo})
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-ink-secondary">{estimate.jobDescription ?? '—'}</TableCell>
                    <TableCell className="num">{formatMoney(estimate.total)}</TableCell>
                    <TableCell>
                      <Badge tone={APPROVAL_STATUS_TONE[estimate.approvalStatus]}>{APPROVAL_STATUS_LABEL[estimate.approvalStatus]}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-ink-secondary">
                      {formatDate(estimate.createdAt)}
                      <br />
                      <span className="text-xs text-ink-muted">{formatTime(estimate.createdAt)}</span>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/estimates/${estimate.id}`}
                        aria-label="View estimate"
                        title="View estimate"
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-ink-secondary hover:bg-surface-hover hover:text-ink"
                      >
                        <Eye className="h-4 w-4" aria-hidden />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
