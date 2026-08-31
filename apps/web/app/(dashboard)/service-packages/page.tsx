'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, Plus, Package, CheckCircle2, PauseCircle, IndianRupee, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { usePermission } from '@/lib/hooks/use-permission';
import type { PaginatedResult, ServicePackage, ServicePackageSummary } from '@/lib/api-types';
import { formatMoney, formatNumber } from '@/lib/format';
import { exportRowsAsCsv } from '@/lib/export/csv';
import { ServicePackageStatusBadge } from '@/components/domain/service-package-status-badge';
import { ServicePackageActionsMenu } from '@/components/domain/service-package-actions-menu';
import { KpiCard } from '@/components/domain/kpi-card';
import { Card, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const PAGE_SIZE = 10;

export default function ServicePackagesPage() {
  const router = useRouter();
  const canCreate = usePermission('service-package:create');

  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState<'' | 'true' | 'false'>('');
  const [validityMonths, setValidityMonths] = useState('');
  const [visitLimit, setVisitLimit] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [actionError, setActionError] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const summary = useApiQuery<ServicePackageSummary>(() => apiGet('/service-packages/summary'), []);

  const query = useApiQuery<PaginatedResult<ServicePackage>>(
    () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (isActive) params.set('isActive', isActive);
      if (validityMonths) params.set('validityMonths', validityMonths);
      if (visitLimit) params.set('visitLimit', visitLimit);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      return apiGet(`/service-packages?${params.toString()}`);
    },
    [page, pageSize, debouncedSearch, isActive, validityMonths, visitLimit, minPrice, maxPrice],
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleReset() {
    setSearch('');
    setIsActive('');
    setValidityMonths('');
    setVisitLimit('');
    setMinPrice('');
    setMaxPrice('');
    setPage(1);
  }

  function handleKpiClick(next: '' | 'true' | 'false') {
    setIsActive((current) => (current === next ? '' : next));
    setPage(1);
  }

  function handleExport() {
    if (!query.data) return;
    const columns = [
      { key: 'name', label: 'Package' },
      { key: 'description', label: 'Description' },
      { key: 'price', label: 'Price' },
      { key: 'gstRate', label: 'GST %' },
      { key: 'validityMonths', label: 'Validity (months)' },
      { key: 'visitLimit', label: 'Visit Limit' },
      { key: 'status', label: 'Status' },
    ];
    const rows = query.data.items.map((p) => ({
      name: p.name,
      description: p.description ?? '—',
      price: p.price,
      gstRate: `${p.gstRate}%`,
      validityMonths: p.validityMonths,
      visitLimit: p.visitLimit ?? 'Unlimited',
      status: p.isActive ? 'Active' : 'Inactive',
    }));
    exportRowsAsCsv(columns, rows, `service-packages-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  const hasActiveFilters = Boolean(debouncedSearch || isActive || validityMonths || visitLimit || minPrice || maxPrice);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Service Packages</h1>
          <p className="text-sm text-ink-secondary">Manage AMC and service packages offered to customers.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleExport} disabled={!query.data}>
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Export
          </Button>
          {canCreate ? (
            <Button type="button" size="sm" onClick={() => router.push('/service-packages/new')}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              New Package
            </Button>
          ) : null}
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
          <KpiCard label="Total Packages" value={formatNumber(summary.data.total)} sublabel="All Packages" tone="neutral" icon={<Package className="h-4 w-4" />} />
          <button type="button" onClick={() => handleKpiClick('true')} className="text-left">
            <KpiCard label="Active Packages" value={formatNumber(summary.data.active)} sublabel="Currently Active" tone="teal" icon={<CheckCircle2 className="h-4 w-4" />} />
          </button>
          <button type="button" onClick={() => handleKpiClick('false')} className="text-left">
            <KpiCard label="Inactive Packages" value={formatNumber(summary.data.inactive)} sublabel="Inactive / Draft" tone="warning" icon={<PauseCircle className="h-4 w-4" />} />
          </button>
          <KpiCard label="Avg. Package Price" value={formatMoney(summary.data.avgPrice)} sublabel="Across all packages" tone="fuchsia" icon={<IndianRupee className="h-4 w-4" />} />
          {summary.data.mostPopular ? (
            <Link href={`/service-packages/${summary.data.mostPopular.id}`}>
              <KpiCard
                label="Most Popular Package"
                value={summary.data.mostPopular.name}
                sublabel={`Sold ${summary.data.mostPopular.soldCount} time${summary.data.mostPopular.soldCount === 1 ? '' : 's'}`}
                tone="blue"
                icon={<Star className="h-4 w-4" />}
              />
            </Link>
          ) : (
            <KpiCard label="Most Popular Package" value="—" sublabel="No sales yet" tone="blue" icon={<Star className="h-4 w-4" />} />
          )}
        </div>
      ) : null}

      <Card>
        <CardBody className="flex flex-col gap-3 pt-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="max-w-sm flex-1">
              <Input value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search by name or description…" aria-label="Search service packages" />
            </div>
            <div className="w-40">
              <Select value={isActive} onChange={(e) => { setIsActive(e.target.value as typeof isActive); setPage(1); }} aria-label="Filter by status">
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
            </div>
            {summary.data && summary.data.validityOptions.length > 0 ? (
              <div className="w-40">
                <Select value={validityMonths} onChange={(e) => { setValidityMonths(e.target.value); setPage(1); }} aria-label="Filter by validity">
                  <option value="">All Validity</option>
                  {summary.data.validityOptions.map((months) => (
                    <option key={months} value={months}>
                      {months} months
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            {summary.data && summary.data.visitLimitOptions.length > 0 ? (
              <div className="w-40">
                <Select value={visitLimit} onChange={(e) => { setVisitLimit(e.target.value); setPage(1); }} aria-label="Filter by visit limit">
                  <option value="">All Visit Limits</option>
                  {summary.data.visitLimitOptions.map((limit) => (
                    <option key={limit} value={limit}>
                      {limit} visits
                    </option>
                  ))}
                  <option value="unlimited">Unlimited</option>
                </Select>
              </div>
            ) : null}
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
              <Input label="Min Price (₹)" type="number" min={0} value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setPage(1); }} className="w-36" />
              <Input label="Max Price (₹)" type="number" min={0} value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }} className="w-36" />
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
            <p className="text-sm font-medium text-ink">No service packages yet</p>
            <p className="text-xs text-ink-muted">Add your first AMC or service package to start selling it to customers.</p>
          </div>
          {canCreate ? (
            <Button type="button" size="sm" onClick={() => router.push('/service-packages/new')}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Add Package
            </Button>
          ) : null}
        </div>
      ) : null}

      {query.data && query.data.items.length === 0 && hasActiveFilters ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-5 py-14 text-center">
          <Package className="h-8 w-8 text-ink-muted" aria-hidden />
          <div>
            <p className="text-sm font-medium text-ink">No packages found</p>
            <p className="text-xs text-ink-muted">Try changing your search or filters.</p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={handleReset}>
            Clear Filters
          </Button>
        </div>
      ) : null}

      {query.data && query.data.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface shadow-card sm:block">
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Package</TableHeaderCell>
                  <TableHeaderCell>Description</TableHeaderCell>
                  <TableHeaderCell className="text-right">Price</TableHeaderCell>
                  <TableHeaderCell className="text-right">GST %</TableHeaderCell>
                  <TableHeaderCell>Validity</TableHeaderCell>
                  <TableHeaderCell>Visit Limit</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {query.data.items.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-semibold">
                      <Link href={`/service-packages/${pkg.id}`} className="text-ink hover:text-accent-600">
                        {pkg.name}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-ink-secondary">{pkg.description ?? '—'}</TableCell>
                    <TableCell className="num text-right font-medium text-ink">{formatMoney(pkg.price)}</TableCell>
                    <TableCell className="num text-right text-ink-secondary">{pkg.gstRate}%</TableCell>
                    <TableCell className="num text-ink-secondary">{pkg.validityMonths} mo</TableCell>
                    <TableCell className="num text-ink-secondary">{pkg.visitLimit ?? 'Unlimited'}</TableCell>
                    <TableCell>
                      <ServicePackageStatusBadge isActive={pkg.isActive} />
                    </TableCell>
                    <TableCell>
                      <ServicePackageActionsMenu pkg={pkg} onChanged={query.refetch} onError={setActionError} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:hidden">
            {query.data.items.map((pkg) => (
              <ServicePackageCard key={pkg.id} pkg={pkg} onChanged={query.refetch} onError={setActionError} />
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

function ServicePackageCard({ pkg, onChanged, onError }: { pkg: ServicePackage; onChanged: () => void; onError: (message: string) => void }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface p-3 shadow-panel">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href={`/service-packages/${pkg.id}`} className="text-sm font-semibold text-ink hover:text-accent-600">
            {pkg.name}
          </Link>
          <p className="text-xs text-ink-secondary">{pkg.description ?? '—'}</p>
        </div>
        <ServicePackageStatusBadge isActive={pkg.isActive} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="num font-medium text-ink">{formatMoney(pkg.price)}</span>
        <span className="num text-xs text-ink-secondary">
          {pkg.validityMonths} mo · {pkg.visitLimit ?? 'Unlimited'} visits
        </span>
      </div>
      <div className="flex items-center justify-end border-t border-line pt-2">
        <ServicePackageActionsMenu pkg={pkg} onChanged={onChanged} onError={onError} />
      </div>
    </div>
  );
}
