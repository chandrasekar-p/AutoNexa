'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, Plus, Building2, CheckCircle2, UserX, IndianRupee, ChevronDown, ChevronUp } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { usePermission } from '@/lib/hooks/use-permission';
import type { PaginatedResult, Supplier, SupplierSummary } from '@/lib/api-types';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { parseCreditDays } from '@/lib/suppliers/parse-credit-days';
import { exportRowsAsCsv } from '@/lib/export/csv';
import { SupplierStatusBadge } from '@/components/domain/supplier-status-badge';
import { SupplierActionsMenu } from '@/components/domain/supplier-actions-menu';
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

export default function SuppliersPage() {
  const router = useRouter();
  const canCreate = usePermission('supplier:create');

  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState<'' | 'true' | 'false'>('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [actionError, setActionError] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const summary = useApiQuery<SupplierSummary>(() => apiGet('/suppliers/summary'), []);

  const query = useApiQuery<PaginatedResult<Supplier>>(
    () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (isActive) params.set('isActive', isActive);
      if (paymentTerms) params.set('paymentTerms', paymentTerms);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      return apiGet(`/suppliers?${params.toString()}`);
    },
    [page, pageSize, debouncedSearch, isActive, paymentTerms, from, to],
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleReset() {
    setSearch('');
    setIsActive('');
    setPaymentTerms('');
    setFrom('');
    setTo('');
    setPage(1);
  }

  function handleKpiClick(next: '' | 'true' | 'false') {
    setIsActive((current) => (current === next ? '' : next));
    setPage(1);
  }

  function handleExport() {
    if (!query.data) return;
    const columns = [
      { key: 'name', label: 'Supplier' },
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'mobile', label: 'Mobile' },
      { key: 'email', label: 'Email' },
      { key: 'gstin', label: 'GSTIN' },
      { key: 'paymentTerms', label: 'Payment Terms' },
      { key: 'creditDays', label: 'Credit Days' },
      { key: 'status', label: 'Status' },
    ];
    const rows = query.data.items.map((s) => ({
      name: s.name,
      contactPerson: s.contactPerson ?? '—',
      mobile: s.mobile ?? '—',
      email: s.email ?? '—',
      gstin: s.gstin ?? '—',
      paymentTerms: s.paymentTerms ?? '—',
      creditDays: parseCreditDays(s.paymentTerms) ?? '—',
      status: s.isActive ? 'Active' : 'Inactive',
    }));
    exportRowsAsCsv(columns, rows, `suppliers-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  const hasActiveFilters = Boolean(debouncedSearch || isActive || paymentTerms || from || to);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Suppliers</h1>
          <p className="text-sm text-ink-secondary">Manage your parts suppliers, contacts, payment terms and purchasing relationships.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleExport} disabled={!query.data}>
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Export
          </Button>
          {canCreate ? (
            <Button type="button" size="sm" onClick={() => router.push('/suppliers/new')}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              New Supplier
            </Button>
          ) : null}
        </div>
      </div>

      {summary.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : null}
      {summary.error ? <ErrorState message={summary.error} onRetry={summary.refetch} /> : null}
      {summary.data ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard label="Total Suppliers" value={formatNumber(summary.data.total)} sublabel="All Suppliers" tone="neutral" icon={<Building2 className="h-4 w-4" />} />
          <button type="button" onClick={() => handleKpiClick('true')} className="text-left">
            <KpiCard label="Active Suppliers" value={formatNumber(summary.data.active)} sublabel="Currently Active" tone="teal" icon={<CheckCircle2 className="h-4 w-4" />} />
          </button>
          <button type="button" onClick={() => handleKpiClick('false')} className="text-left">
            <KpiCard label="Inactive" value={formatNumber(summary.data.inactive)} sublabel="Requires Attention" tone="warning" icon={<UserX className="h-4 w-4" />} />
          </button>
          <KpiCard label="Total Purchases" value={formatMoney(summary.data.totalPurchasesThisMonth)} sublabel="This Month" tone="fuchsia" icon={<IndianRupee className="h-4 w-4" />} />
        </div>
      ) : null}

      <Card>
        <CardBody className="flex flex-col gap-3 pt-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="max-w-sm flex-1">
              <Input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by supplier name, contact, mobile, email or GSTIN…"
                aria-label="Search suppliers"
              />
            </div>
            <div className="w-40">
              <Select value={isActive} onChange={(e) => { setIsActive(e.target.value as typeof isActive); setPage(1); }} aria-label="Filter by status">
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
            </div>
            {summary.data && summary.data.paymentTermsOptions.length > 0 ? (
              <div className="w-44">
                <Select value={paymentTerms} onChange={(e) => { setPaymentTerms(e.target.value); setPage(1); }} aria-label="Filter by payment terms">
                  <option value="">All Payment Terms</option>
                  {summary.data.paymentTermsOptions.map((term) => (
                    <option key={term} value={term}>
                      {term}
                    </option>
                  ))}
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
              <Input label="Added From" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="w-40" />
              <Input label="Added To" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="w-40" />
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
          <Building2 className="h-8 w-8 text-ink-muted" aria-hidden />
          <div>
            <p className="text-sm font-medium text-ink">No suppliers yet</p>
            <p className="text-xs text-ink-muted">Add your first parts supplier to start managing purchasing relationships.</p>
          </div>
          {canCreate ? (
            <Button type="button" size="sm" onClick={() => router.push('/suppliers/new')}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Add Supplier
            </Button>
          ) : null}
        </div>
      ) : null}

      {query.data && query.data.items.length === 0 && hasActiveFilters ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-5 py-14 text-center">
          <Building2 className="h-8 w-8 text-ink-muted" aria-hidden />
          <div>
            <p className="text-sm font-medium text-ink">No suppliers found</p>
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
                  <TableHeaderCell>Supplier</TableHeaderCell>
                  <TableHeaderCell>Contact Person</TableHeaderCell>
                  <TableHeaderCell>Mobile</TableHeaderCell>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>GSTIN</TableHeaderCell>
                  <TableHeaderCell>Payment Terms</TableHeaderCell>
                  <TableHeaderCell>Credit Days</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {query.data.items.map((supplier) => {
                  const creditDays = parseCreditDays(supplier.paymentTerms);
                  return (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-semibold">
                        <Link href={`/suppliers/${supplier.id}`} className="text-ink hover:text-accent-600">
                          {supplier.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-ink-secondary">{supplier.contactPerson ?? '—'}</TableCell>
                      <TableCell className="num text-ink-secondary">{supplier.mobile ?? '—'}</TableCell>
                      <TableCell className="text-ink-secondary">{supplier.email ?? '—'}</TableCell>
                      <TableCell className="num text-ink-secondary">{supplier.gstin ?? '—'}</TableCell>
                      <TableCell className="text-ink-secondary">{supplier.paymentTerms ?? '—'}</TableCell>
                      <TableCell className="num text-ink-secondary">{creditDays !== null ? `${creditDays} days` : '—'}</TableCell>
                      <TableCell>
                        <SupplierStatusBadge isActive={supplier.isActive} />
                      </TableCell>
                      <TableCell>
                        <SupplierActionsMenu supplier={supplier} onChanged={query.refetch} onError={setActionError} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:hidden">
            {query.data.items.map((supplier) => (
              <SupplierCard key={supplier.id} supplier={supplier} onChanged={query.refetch} onError={setActionError} />
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

function SupplierCard({ supplier, onChanged, onError }: { supplier: Supplier; onChanged: () => void; onError: (message: string) => void }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface p-3 shadow-panel">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href={`/suppliers/${supplier.id}`} className="text-sm font-semibold text-ink hover:text-accent-600">
            {supplier.name}
          </Link>
          <p className="text-xs text-ink-secondary">{supplier.contactPerson ?? '—'}</p>
        </div>
        <SupplierStatusBadge isActive={supplier.isActive} />
      </div>
      <div className="flex flex-col gap-1 text-xs text-ink-secondary">
        <span className="num">{supplier.mobile ?? '—'}</span>
        <span className="num">{supplier.gstin ?? '—'}</span>
        <span>{supplier.paymentTerms ?? '—'}</span>
      </div>
      <div className="flex items-center justify-between border-t border-line pt-2">
        <span className="text-xs text-ink-muted">Added {formatDate(supplier.createdAt)}</span>
        <SupplierActionsMenu supplier={supplier} onChanged={onChanged} onError={onError} />
      </div>
    </div>
  );
}
