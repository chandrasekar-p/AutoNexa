'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import type { InspectionListItem, InspectionStatus, PaginatedResult } from '@/lib/api-types';
import { formatDate } from '@/lib/format';
import { InspectionStatusBadge } from '@/components/domain/inspection-status-badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const PAGE_SIZE = 20;

export default function InspectionsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<InspectionStatus | ''>('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const query = useApiQuery<PaginatedResult<InspectionListItem>>(
    () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (status) params.set('status', status);
      return apiGet(`/inspections?${params.toString()}`);
    },
    [page, debouncedSearch, status],
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(value: string) {
    setStatus(value as InspectionStatus | '');
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Inspections</h1>
        <p className="text-sm text-ink-secondary">
          Started from a vehicle&rsquo;s page — this is every inspection on file, across all vehicles.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="max-w-sm flex-1">
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by notes"
            aria-label="Search inspections"
          />
        </div>
        <div className="w-52">
          <Select value={status} onChange={(e) => handleStatusChange(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </Select>
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
          No inspections match those filters.
        </p>
      ) : null}

      {query.data && query.data.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-line bg-surface shadow-card">
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Started</TableHeaderCell>
                  <TableHeaderCell>Notes</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {query.data.items.map((inspection) => (
                  <TableRow key={inspection.id}>
                    <TableCell className="font-medium">
                      <Link href={`/inspections/${inspection.id}`} className="hover:text-accent-600">
                        {formatDate(inspection.createdAt)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-ink-secondary">{inspection.notes ?? '—'}</TableCell>
                    <TableCell>
                      <InspectionStatusBadge status={inspection.status} />
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
