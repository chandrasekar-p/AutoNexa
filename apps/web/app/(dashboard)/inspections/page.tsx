'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Car, CheckCircle2, Clock, Eye, Pencil, AlertTriangle } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import type { InspectionDisplayStatus, InspectionListItem, InspectionSummary, PaginatedResult } from '@/lib/api-types';
import { formatDate, formatDurationMinutes, formatNumber, formatTime } from '@/lib/format';
import { InspectionDisplayStatusBadge, INSPECTION_DISPLAY_STATUS_LABEL } from '@/components/domain/inspection-display-status-badge';
import { KpiCard } from '@/components/domain/kpi-card';
import { Card, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const DEFAULT_PAGE_SIZE = 10;
const STATUSES: InspectionDisplayStatus[] = ['IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED', 'OVERDUE'];

export default function InspectionsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<InspectionDisplayStatus | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const debouncedSearch = useDebouncedValue(search);

  const summary = useApiQuery<InspectionSummary>(() => apiGet('/inspections/summary'), []);

  const query = useApiQuery<PaginatedResult<InspectionListItem>>(
    () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (status) params.set('status', status);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      return apiGet(`/inspections?${params.toString()}`);
    },
    [page, pageSize, debouncedSearch, status, from, to],
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleReset() {
    setSearch('');
    setStatus('');
    setFrom('');
    setTo('');
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Inspections</h1>
          <p className="text-sm text-ink-secondary">Detailed vehicle health checks — safer vehicles, happier customers.</p>
        </div>
        <Link href="/inspections/new">
          <Button type="button" size="sm">
            + New Inspection
          </Button>
        </Link>
      </div>

      {summary.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : null}
      {summary.error ? <ErrorState message={summary.error} onRetry={summary.refetch} /> : null}
      {summary.data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="In Progress" value={formatNumber(summary.data.inProgress)} sublabel="Inspections" tone="accent" icon={<Clock className="h-4 w-4" />} />
          <KpiCard
            label="Completed"
            value={formatNumber(summary.data.completedThisMonth)}
            sublabel="This month"
            tone="teal"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <KpiCard
            label="Pending Review"
            value={formatNumber(summary.data.pendingReview)}
            sublabel="Inspections"
            tone="warning"
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          <KpiCard label="Overdue" value={formatNumber(summary.data.overdue)} sublabel="Inspections" tone="danger" icon={<AlertTriangle className="h-4 w-4" />} />
        </div>
      ) : null}

      <Card>
        <CardBody className="flex flex-wrap items-end gap-3 pt-5">
          <div className="max-w-sm flex-1">
            <Input
              label="Search"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by notes, vehicle, or customer…"
              aria-label="Search inspections"
            />
          </div>
          <div className="w-48">
            <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value as InspectionDisplayStatus | ''); setPage(1); }}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {INSPECTION_DISPLAY_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </div>
          <Input label="From Date" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="w-40" />
          <Input label="To Date" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="w-40" />
          <Button type="button" variant="secondary" size="sm" onClick={handleReset}>
            Reset
          </Button>
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
          {debouncedSearch || status || from || to ? 'No inspections match those filters.' : 'No inspections yet — start one from a vehicle’s page.'}
        </p>
      ) : null}

      {query.data && query.data.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-line bg-surface shadow-card">
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Started</TableHeaderCell>
                  <TableHeaderCell>Vehicle</TableHeaderCell>
                  <TableHeaderCell>Customer</TableHeaderCell>
                  <TableHeaderCell>Notes</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {query.data.items.map((inspection) => (
                  <TableRow key={inspection.id}>
                    <TableCell className="whitespace-nowrap">
                      <Link href={`/inspections/${inspection.id}`} className="font-medium text-ink hover:text-accent-600">
                        {formatDate(inspection.createdAt)} {formatTime(inspection.createdAt)}
                      </Link>
                      <p className="text-xs text-ink-muted">{formatDurationMinutes(inspection.durationMinutes)}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Car className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden />
                        <div>
                          <p className="num text-ink">{inspection.vehicle.registrationNo}</p>
                          <p className="text-xs text-ink-muted">
                            {inspection.vehicle.brand} {inspection.vehicle.model}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-ink">{inspection.vehicle.customer.name}</p>
                      <p className="num text-xs text-ink-muted">{inspection.vehicle.customer.mobile}</p>
                    </TableCell>
                    <TableCell className="max-w-[16rem] truncate text-ink-secondary">{inspection.notes ?? '—'}</TableCell>
                    <TableCell>
                      <InspectionDisplayStatusBadge status={inspection.displayStatus} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/inspections/${inspection.id}`}
                          aria-label="View inspection"
                          title="View"
                          className="inline-flex h-7 w-7 items-center justify-center rounded text-ink-secondary hover:bg-surface-hover hover:text-ink"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                        <Link
                          href={`/inspections/${inspection.id}`}
                          aria-label="Edit inspection"
                          title="Edit"
                          className="inline-flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:bg-surface-hover hover:text-ink"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </div>
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
