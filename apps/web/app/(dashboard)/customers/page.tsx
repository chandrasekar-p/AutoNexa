'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { usePermission } from '@/lib/hooks/use-permission';
import type { Customer, PaginatedResult } from '@/lib/api-types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const PAGE_SIZE = 20;

export default function CustomersPage() {
  const router = useRouter();
  const canCreate = usePermission('customer:create');
  const canUpdate = usePermission('customer:update');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const query = useApiQuery<PaginatedResult<Customer>>(
    () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      return apiGet(`/customers?${params.toString()}`);
    },
    [page, debouncedSearch],
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1); // a new search always starts back at page 1
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Customers</h1>
          <p className="text-sm text-ink-secondary">Every customer on file, across all vehicles and visits.</p>
        </div>
        {canCreate ? (
          <Button onClick={() => router.push('/customers/new')}>New Customer</Button>
        ) : null}
      </div>

      <div className="max-w-sm">
        <Input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by name, mobile, or email"
          aria-label="Search customers"
        />
      </div>

      {query.isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}

      {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}

      {query.data && query.data.items.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface px-5 py-10 text-center text-sm text-ink-muted">
          {debouncedSearch ? 'No customers match that search.' : 'No customers yet — add the first one to get started.'}
        </p>
      ) : null}

      {query.data && query.data.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-line bg-surface shadow-card">
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Mobile</TableHeaderCell>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>City</TableHeaderCell>
                  <TableHeaderCell>Type</TableHeaderCell>
                  {canUpdate ? <TableHeaderCell className="w-10" /> : null}
                </tr>
              </TableHead>
              <TableBody>
                {query.data.items.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      <Link href={`/customers/${customer.id}`} className="hover:text-accent-600">
                        {customer.name}
                      </Link>
                    </TableCell>
                    <TableCell className="num">{customer.mobile}</TableCell>
                    <TableCell className="text-ink-secondary">{customer.email ?? '—'}</TableCell>
                    <TableCell className="text-ink-secondary">{customer.city ?? '—'}</TableCell>
                    <TableCell>
                      <Badge tone={customer.customerType === 'business' ? 'accent' : 'neutral'}>
                        {customer.customerType}
                      </Badge>
                    </TableCell>
                    {canUpdate ? (
                      <TableCell className="text-right">
                        <Link
                          href={`/customers/${customer.id}/edit`}
                          aria-label={`Edit ${customer.name}`}
                          title="Edit"
                          className="inline-flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:bg-surface-hover hover:text-ink"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </TableCell>
                    ) : null}
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
