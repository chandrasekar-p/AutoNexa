'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { usePermission } from '@/lib/hooks/use-permission';
import type { PaginatedResult, Technician, TechnicianStatus } from '@/lib/api-types';
import { TechnicianStatusBadge } from '@/components/domain/technician-status-badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const PAGE_SIZE = 20;

export default function TechniciansPage() {
  const router = useRouter();
  const canCreate = usePermission('technician:create');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TechnicianStatus | ''>('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const query = useApiQuery<PaginatedResult<Technician>>(
    () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (status) params.set('status', status);
      return apiGet(`/technicians?${params.toString()}`);
    },
    [page, debouncedSearch, status],
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(value: string) {
    setStatus(value as TechnicianStatus | '');
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Technicians</h1>
          <p className="text-sm text-ink-secondary">Every technician profile on file.</p>
        </div>
        {canCreate ? <Button onClick={() => router.push('/technicians/new')}>New Technician</Button> : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="max-w-sm flex-1">
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by employee ID or specialisation"
            aria-label="Search technicians"
          />
        </div>
        <div className="w-52">
          <Select value={status} onChange={(e) => handleStatusChange(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="INACTIVE">Inactive</option>
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
          No technicians match those filters.
        </p>
      ) : null}

      {query.data && query.data.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-line bg-surface shadow-card">
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Employee ID</TableHeaderCell>
                  <TableHeaderCell>Specialisation</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {query.data.items.map((technician) => (
                  <TableRow key={technician.id}>
                    <TableCell className="font-medium">
                      <Link href={`/technicians/${technician.id}`} className="hover:text-accent-600">
                        {technician.user.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-ink-secondary">{technician.employeeId ?? '—'}</TableCell>
                    <TableCell className="text-ink-secondary">{technician.specialisation ?? '—'}</TableCell>
                    <TableCell>
                      <TechnicianStatusBadge status={technician.status} />
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
