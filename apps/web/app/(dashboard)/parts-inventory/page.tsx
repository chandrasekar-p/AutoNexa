'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { usePermission } from '@/lib/hooks/use-permission';
import type { PaginatedResult, Part } from '@/lib/api-types';
import { formatMoney } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const PAGE_SIZE = 20;

export default function PartsInventoryPage() {
  const router = useRouter();
  const canCreate = usePermission('part:create');
  const canUpdate = usePermission('part:update');

  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const query = useApiQuery<PaginatedResult<Part>>(
    () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (lowStockOnly) params.set('lowStock', 'true');
      return apiGet(`/parts?${params.toString()}`);
    },
    [page, debouncedSearch, lowStockOnly],
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Parts & Inventory</h1>
          <p className="text-sm text-ink-secondary">Every part on file, with current stock.</p>
        </div>
        {canCreate ? <Button onClick={() => router.push('/parts-inventory/new')}>New Part</Button> : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="max-w-sm flex-1">
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by part number, SKU, or name"
            aria-label="Search parts"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-secondary">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => {
              setLowStockOnly(e.target.checked);
              setPage(1);
            }}
            className="h-4 w-4 rounded border-line"
          />
          Low stock only
        </label>
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
          {debouncedSearch || lowStockOnly ? 'No parts match those filters.' : 'No parts yet — add the first one to get started.'}
        </p>
      ) : null}

      {query.data && query.data.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-line bg-surface shadow-card">
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Part Number</TableHeaderCell>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Stock</TableHeaderCell>
                  <TableHeaderCell>Selling Price</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  {canUpdate ? <TableHeaderCell className="w-10" /> : null}
                </tr>
              </TableHead>
              <TableBody>
                {query.data.items.map((part) => {
                  const isLow = part.currentStock <= part.minStock;
                  return (
                    <TableRow key={part.id}>
                      <TableCell className="num font-medium">
                        <Link href={`/parts-inventory/${part.id}`} className="hover:text-accent-600">
                          {part.partNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-ink-secondary">{part.name}</TableCell>
                      <TableCell className="num">
                        <span className={isLow ? 'font-medium text-warning-600 dark:text-warning-400' : 'text-ink'}>
                          {part.currentStock}
                        </span>{' '}
                        <span className="text-ink-muted">/ {part.minStock} min</span>
                      </TableCell>
                      <TableCell className="num">{formatMoney(part.sellingPrice)}</TableCell>
                      <TableCell>
                        <Badge tone={part.isActive ? 'success' : 'neutral'}>{part.isActive ? 'Active' : 'Inactive'}</Badge>
                      </TableCell>
                      {canUpdate ? (
                        <TableCell className="text-right">
                          <Link
                            href={`/parts-inventory/${part.id}/edit`}
                            aria-label={`Edit ${part.name}`}
                            title="Edit"
                            className="inline-flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:bg-surface-hover hover:text-ink"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                          </Link>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
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
