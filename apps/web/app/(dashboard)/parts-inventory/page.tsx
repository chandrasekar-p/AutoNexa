'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Pencil, Plus, Boxes, PackageCheck, AlertTriangle, PackageX, IndianRupee, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { usePermission } from '@/lib/hooks/use-permission';
import { cn } from '@/lib/cn';
import type { Part, PartCategory, PartStockStatus, PartSummary, PaginatedResult, Supplier } from '@/lib/api-types';
import { formatMoney, formatNumber, formatDate } from '@/lib/format';
import { derivePartStockStatus } from '@/lib/parts/stock-status';
import { StockStatusBadge } from '@/components/domain/stock-status-badge';
import { StockProgressBar } from '@/components/domain/stock-progress-bar';
import { PartActionsMenu } from '@/components/domain/part-actions-menu';
import { StockAdjustmentModal } from '@/components/domain/stock-adjustment-modal';
import { KpiCard } from '@/components/domain/kpi-card';
import { Card, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const PAGE_SIZE = 10;
const STOCK_STATUSES: PartStockStatus[] = ['in_stock', 'low_stock', 'out_of_stock'];
const STOCK_STATUS_LABEL: Record<PartStockStatus, string> = { in_stock: 'In Stock', low_stock: 'Low Stock', out_of_stock: 'Out of Stock' };

export default function PartsInventoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canCreate = usePermission('part:create');
  const canUpdate = usePermission('part:update');

  const preselectedSupplierId = searchParams.get('supplierId');

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [supplierId, setSupplierId] = useState(preselectedSupplierId ?? '');
  const [stockStatus, setStockStatus] = useState<PartStockStatus | ''>('');
  const [isActive, setIsActive] = useState<'' | 'true' | 'false'>('true');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [adjustingPart, setAdjustingPart] = useState<Part | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const summary = useApiQuery<PartSummary>(() => apiGet('/parts/summary'), []);
  const categories = useApiQuery<PartCategory[]>(() => apiGet('/part-categories'), []);
  const suppliers = useApiQuery<PaginatedResult<Supplier>>(() => apiGet('/suppliers?isActive=true&pageSize=100'), []);

  const query = useApiQuery<PaginatedResult<Part>>(
    () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (categoryId) params.set('categoryId', categoryId);
      if (brand) params.set('brand', brand);
      if (supplierId) params.set('supplierId', supplierId);
      if (stockStatus) params.set('stockStatus', stockStatus);
      if (isActive) params.set('isActive', isActive);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      return apiGet(`/parts?${params.toString()}`);
    },
    [page, pageSize, debouncedSearch, categoryId, brand, supplierId, stockStatus, isActive, minPrice, maxPrice],
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleReset() {
    setSearch('');
    setCategoryId('');
    setBrand('');
    setSupplierId('');
    setStockStatus('');
    setIsActive('true');
    setMinPrice('');
    setMaxPrice('');
    setPage(1);
  }

  // Doesn't touch isActive — the KPI counts themselves are scoped to
  // active parts only (see PartsService.summary()'s own doc comment), the
  // same default this page's isActive filter starts at, so a KPI number
  // and clicking through to it always agree.
  function handleKpiClick(status: PartStockStatus | '') {
    setStockStatus((current) => (current === status ? '' : status));
    setPage(1);
  }

  const hasActiveFilters = Boolean(debouncedSearch || categoryId || brand || supplierId || stockStatus || minPrice || maxPrice || isActive !== 'true');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Parts & Inventory</h1>
          <p className="text-sm text-ink-secondary">Manage your parts catalogue, stock, pricing and availability.</p>
        </div>
        {canCreate ? (
          <Button onClick={() => router.push('/parts-inventory/new')}>
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            New Part
          </Button>
        ) : null}
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
          <button type="button" onClick={() => handleKpiClick('')} className="text-left">
            <KpiCard label="Total Parts" value={formatNumber(summary.data.totalParts)} sublabel="All Parts" tone="neutral" icon={<Boxes className="h-4 w-4" />} />
          </button>
          <button type="button" onClick={() => handleKpiClick('in_stock')} className="text-left">
            <KpiCard label="In Stock" value={formatNumber(summary.data.inStock)} sublabel="Available" tone="teal" icon={<PackageCheck className="h-4 w-4" />} />
          </button>
          <button type="button" onClick={() => handleKpiClick('low_stock')} className="text-left">
            <KpiCard label="Low Stock" value={formatNumber(summary.data.lowStock)} sublabel="Reorder Soon" tone="warning" icon={<AlertTriangle className="h-4 w-4" />} />
          </button>
          <button type="button" onClick={() => handleKpiClick('out_of_stock')} className="text-left">
            <KpiCard label="Out of Stock" value={formatNumber(summary.data.outOfStock)} sublabel="Unavailable" tone="danger" icon={<PackageX className="h-4 w-4" />} />
          </button>
          <KpiCard label="Inventory Value" value={formatMoney(summary.data.inventoryValue)} sublabel="Current Stock Value" tone="fuchsia" icon={<IndianRupee className="h-4 w-4" />} />
        </div>
      ) : null}

      <Card>
        <CardBody className="flex flex-col gap-3 pt-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="max-w-sm flex-1">
              <Input value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search by part number, name, SKU, or brand…" aria-label="Search parts" />
            </div>
            <div className="w-44">
              <Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }} aria-label="Filter by category">
                <option value="">All Categories</option>
                {categories.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-40">
              <Select value={brand} onChange={(e) => { setBrand(e.target.value); setPage(1); }} aria-label="Filter by brand">
                <option value="">All Brands</option>
                {summary.data?.brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-44">
              <Select value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setPage(1); }} aria-label="Filter by supplier">
                <option value="">All Suppliers</option>
                {suppliers.data?.items.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-40">
              <Select value={stockStatus} onChange={(e) => { setStockStatus(e.target.value as PartStockStatus | ''); setPage(1); }} aria-label="Filter by stock status">
                <option value="">Stock Status</option>
                {STOCK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STOCK_STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </div>
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
              <Input label="Min Price (₹)" type="number" min={0} value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setPage(1); }} className="w-32" />
              <Input label="Max Price (₹)" type="number" min={0} value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }} className="w-32" />
              <div className="w-40">
                <Select label="Status" value={isActive} onChange={(e) => { setIsActive(e.target.value as '' | 'true' | 'false'); setPage(1); }}>
                  <option value="">All (Active & Inactive)</option>
                  <option value="true">Active only</option>
                  <option value="false">Inactive only</option>
                </Select>
              </div>
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
          <Package className="h-8 w-8 text-ink-muted" aria-hidden />
          <div>
            <p className="text-sm font-medium text-ink">No parts added yet.</p>
            <p className="text-xs text-ink-muted">Add your first part to start tracking workshop inventory.</p>
          </div>
          {canCreate ? (
            <Link href="/parts-inventory/new">
              <Button type="button" size="sm">
                <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Add Part
              </Button>
            </Link>
          ) : null}
        </div>
      ) : null}

      {query.data && query.data.items.length === 0 && hasActiveFilters ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-5 py-14 text-center">
          <Package className="h-8 w-8 text-ink-muted" aria-hidden />
          <div>
            <p className="text-sm font-medium text-ink">No parts found.</p>
            <p className="text-xs text-ink-muted">Try changing your search or filters.</p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={handleReset}>
            Clear Filters
          </Button>
        </div>
      ) : null}

      {query.data && query.data.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          {/* Desktop/tablet table */}
          <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface shadow-card sm:block">
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Part</TableHeaderCell>
                  <TableHeaderCell>Part Number / SKU</TableHeaderCell>
                  <TableHeaderCell>Category</TableHeaderCell>
                  <TableHeaderCell>Brand</TableHeaderCell>
                  <TableHeaderCell>Stock</TableHeaderCell>
                  <TableHeaderCell>Selling Price</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Last Updated</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {query.data.items.map((part) => {
                  const status = derivePartStockStatus(part);
                  return (
                    <TableRow key={part.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-graphite-100 text-graphite-500 dark:bg-graphite-800 dark:text-graphite-400" aria-hidden>
                            <Package className="h-4 w-4" strokeWidth={1.5} />
                          </span>
                          <Link href={`/parts-inventory/${part.id}`} className="font-medium text-ink hover:text-accent-600">
                            {part.name}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="num text-ink">{part.partNumber}</p>
                        <p className="num text-xs text-ink-muted">{part.sku}</p>
                      </TableCell>
                      <TableCell className="text-ink-secondary">{categories.data?.find((c) => c.id === part.categoryId)?.name ?? '—'}</TableCell>
                      <TableCell className="text-ink-secondary">{part.brand ?? '—'}</TableCell>
                      <TableCell className="w-36">
                        <StockProgressBar currentStock={part.currentStock} maxStock={part.maxStock} unit={part.unit} status={status} />
                      </TableCell>
                      <TableCell className="num text-ink">{formatMoney(part.sellingPrice)}</TableCell>
                      <TableCell>
                        <StockStatusBadge status={status} />
                        {!part.isActive ? (
                          <div className="mt-1">
                            <Badge tone="neutral">Inactive</Badge>
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs text-ink-secondary">{formatDate(part.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {canUpdate ? (
                            <Link
                              href={`/parts-inventory/${part.id}/edit`}
                              aria-label={`Edit ${part.name}`}
                              title="Edit"
                              className="inline-flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:bg-surface-hover hover:text-ink"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden />
                            </Link>
                          ) : null}
                          <PartActionsMenu part={part} onAdjustStock={() => setAdjustingPart(part)} onChanged={query.refetch} onError={setActionError} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile card list */}
          <div className="flex flex-col gap-3 sm:hidden">
            {query.data.items.map((part) => {
              const status = derivePartStockStatus(part);
              return (
                <div key={part.id} className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3 shadow-panel">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/parts-inventory/${part.id}`} className="text-sm font-semibold text-ink hover:text-accent-600">
                        {part.name}
                      </Link>
                      <p className="num text-xs text-ink-muted">{part.partNumber}</p>
                    </div>
                    <StockStatusBadge status={status} />
                  </div>
                  <p className="text-xs text-ink-secondary">{part.brand ?? '—'}</p>
                  <div className="flex items-center justify-between text-sm">
                    <StockProgressBar currentStock={part.currentStock} maxStock={part.maxStock} unit={part.unit} status={status} />
                    <span className="num font-medium text-ink">{formatMoney(part.sellingPrice)}</span>
                  </div>
                  <div className="flex justify-end gap-1 border-t border-line pt-2">
                    {canUpdate ? (
                      <Link href={`/parts-inventory/${part.id}/edit`} className="inline-flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:bg-surface-hover hover:text-ink">
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    ) : null}
                    <PartActionsMenu part={part} onAdjustStock={() => setAdjustingPart(part)} onChanged={query.refetch} onError={setActionError} />
                  </div>
                </div>
              );
            })}
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

      {adjustingPart ? (
        <StockAdjustmentModal
          part={adjustingPart}
          onClose={() => setAdjustingPart(null)}
          onAdjusted={() => {
            query.refetch();
            summary.refetch();
          }}
        />
      ) : null}
    </div>
  );
}
