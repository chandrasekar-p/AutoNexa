'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { List, LayoutGrid } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { usePermission } from '@/lib/hooks/use-permission';
import { cn } from '@/lib/cn';
import type { JobCardListItem, JobCardStatus, PaginatedResult } from '@/lib/api-types';
import { formatDate } from '@/lib/format';
import { JobCardStatusBadge } from '@/components/domain/job-card-status-badge';
import { JobCardKanbanBoard } from '@/components/domain/job-card-kanban-board';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const PAGE_SIZE = 20;
// The board shows every matching job card as columns, not a paginated
// slice — 20-at-a-time would split single statuses across pages, which
// defeats the point of a board. 100 is the backend's own hard cap
// (ListJobCardsQueryDto's @Max(100)) — asking for more 400s outright.
const BOARD_PAGE_SIZE = 100;
const STATUSES: JobCardStatus[] = [
  'OPEN',
  'DIAGNOSIS',
  'WAITING_APPROVAL',
  'APPROVED',
  'IN_PROGRESS',
  'WAITING_PARTS',
  'QUALITY_CHECK',
  'READY_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];
const STATUS_LABEL: Record<JobCardStatus, string> = {
  OPEN: 'Open',
  DIAGNOSIS: 'Diagnosis',
  WAITING_APPROVAL: 'Waiting Approval',
  APPROVED: 'Approved',
  IN_PROGRESS: 'In Progress',
  WAITING_PARTS: 'Waiting Parts',
  QUALITY_CHECK: 'Quality Check',
  READY_FOR_DELIVERY: 'Ready for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export default function JobCardsPage() {
  const router = useRouter();
  const canCreate = usePermission('job-card:create');
  const canUpdate = usePermission('job-card:update');

  const [view, setView] = useState<'list' | 'board'>('board');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<JobCardStatus | ''>('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const query = useApiQuery<PaginatedResult<JobCardListItem>>(
    () => {
      const params = new URLSearchParams({
        page: String(view === 'board' ? 1 : page),
        pageSize: String(view === 'board' ? BOARD_PAGE_SIZE : PAGE_SIZE),
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      // The board already segments by status via its columns — a status
      // filter on top would just empty out every column but one.
      if (status && view === 'list') params.set('status', status);
      return apiGet(`/job-cards?${params.toString()}`);
    },
    [view, page, debouncedSearch, status],
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(value: string) {
    setStatus(value as JobCardStatus | '');
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Job Cards</h1>
          <p className="text-sm text-ink-secondary">
            {view === 'board' ? 'Drag a card to move it through the pipeline.' : 'The operational core — every job card, newest first.'}
          </p>
        </div>
        {canCreate ? <Button onClick={() => router.push('/job-cards/new')}>New Job Card</Button> : null}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <div className="max-w-sm flex-1">
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by job card number or complaint"
              aria-label="Search job cards"
            />
          </div>
          {view === 'list' ? (
            <div className="w-52">
              <Select value={status} onChange={(e) => handleStatusChange(e.target.value)} aria-label="Filter by status">
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>

        <div className="flex rounded border border-line bg-surface p-0.5">
          <button
            type="button"
            onClick={() => setView('list')}
            aria-pressed={view === 'list'}
            className={cn(
              'flex h-8 items-center gap-1.5 rounded px-3 text-xs font-medium transition-colors',
              view === 'list' ? 'bg-accent-500 text-white' : 'text-ink-secondary hover:bg-surface-hover',
            )}
          >
            <List className="h-3.5 w-3.5" aria-hidden />
            List
          </button>
          <button
            type="button"
            onClick={() => setView('board')}
            aria-pressed={view === 'board'}
            className={cn(
              'flex h-8 items-center gap-1.5 rounded px-3 text-xs font-medium transition-colors',
              view === 'board' ? 'bg-accent-500 text-white' : 'text-ink-secondary hover:bg-surface-hover',
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
            Board
          </button>
        </div>
      </div>

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
          No job cards match those filters.
        </p>
      ) : null}

      {query.data && query.data.items.length > 0 && view === 'board' ? (
        <JobCardKanbanBoard items={query.data.items} canUpdate={canUpdate} onStatusChanged={query.refetch} />
      ) : null}

      {query.data && query.data.items.length > 0 && view === 'list' ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-line bg-surface shadow-card">
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Job Card #</TableHeaderCell>
                  <TableHeaderCell>Customer</TableHeaderCell>
                  <TableHeaderCell>Vehicle</TableHeaderCell>
                  <TableHeaderCell>Expected Delivery</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {query.data.items.map((jobCard) => (
                  <TableRow key={jobCard.id}>
                    <TableCell className="num font-medium">
                      <Link href={`/job-cards/${jobCard.id}`} className="hover:text-accent-600">
                        {jobCard.jobCardNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-ink-secondary">{jobCard.customer.name}</TableCell>
                    <TableCell className="num text-ink-secondary">{jobCard.vehicle.registrationNo}</TableCell>
                    <TableCell className="text-ink-secondary">
                      {jobCard.expectedDelivery ? formatDate(jobCard.expectedDelivery) : '—'}
                    </TableCell>
                    <TableCell>
                      <JobCardStatusBadge status={jobCard.status} />
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
          />
        </div>
      ) : null}
    </div>
  );
}
