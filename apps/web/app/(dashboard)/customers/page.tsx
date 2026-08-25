'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Car, Download, Eye, Mail, Pencil, Phone, Plus, Users } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { usePermission } from '@/lib/hooks/use-permission';
import { exportRowsAsCsv } from '@/lib/export/csv';
import type { CustomerListItem, CustomerSummary, CustomerType, PaginatedResult } from '@/lib/api-types';
import { formatDate, formatNumber, formatTime, initialsFor } from '@/lib/format';
import { KpiCard } from '@/components/domain/kpi-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const DEFAULT_PAGE_SIZE = 10;
type StatusFilter = 'active' | 'inactive' | 'all';

export default function CustomersPage() {
  const router = useRouter();
  const canCreate = usePermission('customer:create');
  const canUpdate = usePermission('customer:update');

  const [search, setSearch] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType | ''>('');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState<StatusFilter>('active');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const debouncedSearch = useDebouncedValue(search);

  const summary = useApiQuery<CustomerSummary>(() => apiGet('/customers/summary'), []);

  const query = useApiQuery<PaginatedResult<CustomerListItem>>(
    () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), status });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (customerType) params.set('customerType', customerType);
      if (city) params.set('city', city);
      return apiGet(`/customers?${params.toString()}`);
    },
    [page, pageSize, debouncedSearch, customerType, city, status],
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleReset() {
    setSearch('');
    setCustomerType('');
    setCity('');
    setStatus('active');
    setPage(1);
  }

  function handleExportCsv() {
    if (!query.data) return;
    const columns = [
      { key: 'customerNumber', label: 'Customer No.' },
      { key: 'name', label: 'Name' },
      { key: 'mobile', label: 'Mobile' },
      { key: 'email', label: 'Email' },
      { key: 'city', label: 'City' },
      { key: 'customerType', label: 'Type' },
      { key: 'vehicleCount', label: 'Vehicles' },
      { key: 'lastVisit', label: 'Last Visit' },
    ];
    const rows = query.data.items.map((c) => ({
      customerNumber: c.customerNumber ?? '—',
      name: c.name,
      mobile: c.mobile,
      email: c.email ?? '—',
      city: c.city ?? '—',
      customerType: c.customerType,
      vehicleCount: c.vehicleCount,
      lastVisit: c.lastVisitAt ? `${formatDate(c.lastVisitAt)} ${formatTime(c.lastVisitAt)}` : '—',
    }));
    exportRowsAsCsv(columns, rows, `customers-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Customers</h1>
          <p className="text-sm text-ink-secondary">Every customer on file, across all vehicles and visits.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleExportCsv} disabled={!query.data}>
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Export
          </Button>
          {canCreate ? (
            <Button type="button" size="sm" onClick={() => router.push('/customers/new')}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              New Customer
            </Button>
          ) : null}
        </div>
      </div>

      {summary.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : null}
      {summary.error ? <ErrorState message={summary.error} onRetry={summary.refetch} /> : null}
      {summary.data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KpiCard label="Total Customers" value={formatNumber(summary.data.total)} sublabel="All time" tone="accent" icon={<Users className="h-4 w-4" />} />
          <KpiCard
            label="Individual"
            value={formatNumber(summary.data.individual)}
            sublabel={summary.data.total > 0 ? `${((summary.data.individual / summary.data.total) * 100).toFixed(1)}% of total` : undefined}
            tone="teal"
          />
          <KpiCard
            label="Business"
            value={formatNumber(summary.data.business)}
            sublabel={summary.data.total > 0 ? `${((summary.data.business / summary.data.total) * 100).toFixed(1)}% of total` : undefined}
            tone="fuchsia"
          />
          <KpiCard label="Cities" value={formatNumber(summary.data.cities.length)} sublabel="Across all customers" tone="warning" />
          <KpiCard label="Total Vehicles" value={formatNumber(summary.data.totalVehicles)} sublabel="Across all customers" tone="blue" icon={<Car className="h-4 w-4" />} />
        </div>
      ) : null}

      <Card>
        <CardBody className="flex flex-wrap items-end gap-3 pt-5">
          <div className="max-w-sm flex-1">
            <Input
              label="Search"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by name, mobile, or email"
              aria-label="Search customers"
            />
          </div>
          <div className="w-40">
            <Select
              label="Customer Type"
              value={customerType}
              onChange={(e) => { setCustomerType(e.target.value as CustomerType | ''); setPage(1); }}
            >
              <option value="">All</option>
              <option value="individual">Individual</option>
              <option value="business">Business</option>
            </Select>
          </div>
          <div className="w-40">
            <Select label="City" value={city} onChange={(e) => { setCity(e.target.value); setPage(1); }}>
              <option value="">All</option>
              {(summary.data?.cities ?? []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-36">
            <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value as StatusFilter); setPage(1); }}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </Select>
          </div>
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
          {debouncedSearch || customerType || city || status !== 'active' ? 'No customers match those filters.' : 'No customers yet — add the first one to get started.'}
        </p>
      ) : null}

      {query.data && query.data.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-line bg-surface shadow-card">
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Customer</TableHeaderCell>
                  <TableHeaderCell>Contact</TableHeaderCell>
                  <TableHeaderCell>City</TableHeaderCell>
                  <TableHeaderCell>Type</TableHeaderCell>
                  <TableHeaderCell>Vehicles</TableHeaderCell>
                  <TableHeaderCell>Last Visit</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {query.data.items.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-500 text-micro font-semibold text-white">
                          {initialsFor(customer.name)}
                        </span>
                        <div>
                          <Link href={`/customers/${customer.id}`} className="font-medium text-ink hover:text-accent-600">
                            {customer.name}
                          </Link>
                          <p className="text-xs text-ink-muted">{customer.customerNumber ?? '—'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5 text-xs text-ink-secondary">
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 shrink-0" aria-hidden />
                          {customer.mobile}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 shrink-0" aria-hidden />
                          {customer.email ?? '—'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-ink-secondary">{customer.city ?? '—'}</TableCell>
                    <TableCell>
                      <Badge tone={customer.customerType === 'business' ? 'accent' : 'neutral'}>{customer.customerType}</Badge>
                    </TableCell>
                    <TableCell>
                      <p className="num text-ink">{customer.vehicleCount}</p>
                      {customer.vehicleCount > 0 ? (
                        <Link href={`/vehicles?customerId=${customer.id}`} className="text-xs text-accent-600 hover:underline">
                          View
                        </Link>
                      ) : (
                        <Link href={`/vehicles/new?customerId=${customer.id}`} className="text-xs text-accent-600 hover:underline">
                          Add Vehicle
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-ink-secondary">
                      {customer.lastVisitAt ? (
                        <>
                          {formatDate(customer.lastVisitAt)}
                          <br />
                          <span className="text-xs text-ink-muted">{formatTime(customer.lastVisitAt)}</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/customers/${customer.id}`}
                          aria-label={`View ${customer.name}`}
                          title="View"
                          className="inline-flex h-7 w-7 items-center justify-center rounded text-ink-secondary hover:bg-surface-hover hover:text-ink"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                        {canUpdate ? (
                          <Link
                            href={`/customers/${customer.id}/edit`}
                            aria-label={`Edit ${customer.name}`}
                            title="Edit"
                            className="inline-flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:bg-surface-hover hover:text-ink"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                          </Link>
                        ) : null}
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
