'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import type { EstimateListItem, EstimateStatus, PaginatedResult } from '@/lib/api-types';
import { formatDate, formatMoney } from '@/lib/format';
import { EstimateStatusBadge, ESTIMATE_STATUS_LABEL } from '@/components/domain/estimate-status-badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const PAGE_SIZE = 20;
const STATUSES: EstimateStatus[] = ['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'CONVERTED'];

export default function EstimatesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<EstimateStatus | ''>('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const query = useApiQuery<PaginatedResult<EstimateListItem>>(
    () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (status) params.set('status', status);
      return apiGet(`/estimates?${params.toString()}`);
    },
    [page, debouncedSearch, status],
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(value: string) {
    setStatus(value as EstimateStatus | '');
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Estimates</h1>
        <p className="text-sm text-ink-secondary">
          Started from a vehicle&rsquo;s page — this is every estimate on file, across all vehicles.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="max-w-sm flex-1">
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by job description"
            aria-label="Search estimates"
          />
        </div>
        <div className="w-52">
          <Select value={status} onChange={(e) => handleStatusChange(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {ESTIMATE_STATUS_LABEL[s]}
              </option>
            ))}
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
          No estimates match those filters.
        </p>
      ) : null}

      {query.data && query.data.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-line bg-surface shadow-card">
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Created</TableHeaderCell>
                  <TableHeaderCell>Job Description</TableHeaderCell>
                  <TableHeaderCell>Total</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {query.data.items.map((estimate) => (
                  <TableRow key={estimate.id}>
                    <TableCell className="font-medium">
                      <Link href={`/estimates/${estimate.id}`} className="hover:text-accent-600">
                        {formatDate(estimate.createdAt)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-ink-secondary">{estimate.jobDescription ?? '—'}</TableCell>
                    <TableCell className="num">{formatMoney(estimate.total)}</TableCell>
                    <TableCell>
                      <EstimateStatusBadge status={estimate.status} />
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
