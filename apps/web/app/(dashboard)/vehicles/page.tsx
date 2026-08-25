'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, Car, Download, Eye, FileCheck, Pencil, Plus, ShieldCheck } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { usePermission } from '@/lib/hooks/use-permission';
import { exportRowsAsCsv } from '@/lib/export/csv';
import type { PaginatedResult, VehicleExpiryStatus, VehicleListItem, VehicleStatus, VehicleSummary } from '@/lib/api-types';
import { daysUntil, formatDate, formatNumber, formatTime } from '@/lib/format';
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

const STATUS_LABEL: Record<VehicleStatus, string> = { ACTIVE: 'Active', EXPIRED: 'Expired', NO_DATA: 'No Data' };
const STATUS_TONE: Record<VehicleStatus, 'success' | 'danger' | 'neutral'> = { ACTIVE: 'success', EXPIRED: 'danger', NO_DATA: 'neutral' };

const EXPIRY_FILTER_LABEL: Record<VehicleExpiryStatus, string> = {
  active: 'Active',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  not_set: 'Not Set',
};

function ExpiryCell({ date, status }: { date: string | null; status: VehicleExpiryStatus }) {
  if (!date) {
    return (
      <>
        <span className="text-ink-secondary">—</span>
        <p className="text-xs text-ink-muted">Not set</p>
      </>
    );
  }
  const days = daysUntil(date);
  const toneClass =
    status === 'expired'
      ? 'text-danger-600 dark:text-danger-400'
      : status === 'expiring_soon'
        ? 'text-warning-600 dark:text-warning-400'
        : 'text-success-600 dark:text-success-400';
  return (
    <>
      <span className="text-ink-secondary">{formatDate(date)}</span>
      <p className={`text-xs font-medium ${toneClass}`}>{status === 'expired' ? 'Expired' : `in ${days} days`}</p>
    </>
  );
}

export default function VehiclesPage() {
  const router = useRouter();
  const canCreate = usePermission('vehicle:create');
  const canUpdate = usePermission('vehicle:update');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<VehicleStatus | ''>('');
  const [insurance, setInsurance] = useState<VehicleExpiryStatus | ''>('');
  const [puc, setPuc] = useState<VehicleExpiryStatus | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const debouncedSearch = useDebouncedValue(search);

  const summary = useApiQuery<VehicleSummary>(() => apiGet('/vehicles/summary'), []);

  const query = useApiQuery<PaginatedResult<VehicleListItem>>(
    () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (status) params.set('status', status);
      if (insurance) params.set('insurance', insurance);
      if (puc) params.set('puc', puc);
      return apiGet(`/vehicles?${params.toString()}`);
    },
    [page, pageSize, debouncedSearch, status, insurance, puc],
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleReset() {
    setSearch('');
    setStatus('');
    setInsurance('');
    setPuc('');
    setPage(1);
  }

  function handleExportCsv() {
    if (!query.data) return;
    const columns = [
      { key: 'registrationNo', label: 'Registration' },
      { key: 'vehicle', label: 'Vehicle' },
      { key: 'vin', label: 'VIN' },
      { key: 'owner', label: 'Owner' },
      { key: 'insuranceExpiry', label: 'Insurance Expiry' },
      { key: 'pucExpiry', label: 'PUC Expiry' },
      { key: 'lastService', label: 'Last Service' },
      { key: 'status', label: 'Status' },
    ];
    const rows = query.data.items.map((v) => ({
      registrationNo: v.registrationNo,
      vehicle: `${v.brand} ${v.model}`,
      vin: v.vin ?? '—',
      owner: v.customerName,
      insuranceExpiry: v.insuranceExpiry ? formatDate(v.insuranceExpiry) : 'Not set',
      pucExpiry: v.pucExpiry ? formatDate(v.pucExpiry) : 'Not set',
      lastService: v.lastServiceAt ? `${formatDate(v.lastServiceAt)} ${formatTime(v.lastServiceAt)}` : '—',
      status: STATUS_LABEL[v.status],
    }));
    exportRowsAsCsv(columns, rows, `vehicles-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Vehicles</h1>
          <p className="text-sm text-ink-secondary">Every vehicle on file, across all customers.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleExportCsv} disabled={!query.data}>
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Export
          </Button>
          {canCreate ? (
            <Button type="button" size="sm" onClick={() => router.push('/vehicles/new')}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              New Vehicle
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
          <KpiCard label="Total Vehicles" value={formatNumber(summary.data.total)} sublabel="All time" tone="accent" icon={<Car className="h-4 w-4" />} />
          <KpiCard
            label="Active Insurance"
            value={formatNumber(summary.data.insuranceActive)}
            sublabel={`Expiring soon: ${formatNumber(summary.data.insuranceExpiringSoon)}`}
            tone="teal"
            icon={<ShieldCheck className="h-4 w-4" />}
          />
          <KpiCard
            label="Active PUC"
            value={formatNumber(summary.data.pucActive)}
            sublabel={`Expiring soon: ${formatNumber(summary.data.pucExpiringSoon)}`}
            tone="warning"
            icon={<FileCheck className="h-4 w-4" />}
          />
          <KpiCard label="Avg. Age" value={`${summary.data.avgAgeYears} Yrs`} sublabel="Across all vehicles" tone="fuchsia" />
          <KpiCard
            label="Upcoming Service"
            value={formatNumber(summary.data.upcomingService)}
            sublabel="Next 30 days"
            tone="blue"
            icon={<Calendar className="h-4 w-4" />}
          />
        </div>
      ) : null}

      <Card>
        <CardBody className="flex flex-wrap items-end gap-3 pt-5">
          <div className="max-w-sm flex-1">
            <Input
              label="Search"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by registration, VIN, brand, or model…"
              aria-label="Search vehicles"
            />
          </div>
          <div className="w-36">
            <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value as VehicleStatus | ''); setPage(1); }}>
              <option value="">All</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="NO_DATA">No Data</option>
            </Select>
          </div>
          <div className="w-40">
            <Select label="Insurance" value={insurance} onChange={(e) => { setInsurance(e.target.value as VehicleExpiryStatus | ''); setPage(1); }}>
              <option value="">All</option>
              {(Object.keys(EXPIRY_FILTER_LABEL) as VehicleExpiryStatus[]).map((v) => (
                <option key={v} value={v}>
                  {EXPIRY_FILTER_LABEL[v]}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-40">
            <Select label="PUC" value={puc} onChange={(e) => { setPuc(e.target.value as VehicleExpiryStatus | ''); setPage(1); }}>
              <option value="">All</option>
              {(Object.keys(EXPIRY_FILTER_LABEL) as VehicleExpiryStatus[]).map((v) => (
                <option key={v} value={v}>
                  {EXPIRY_FILTER_LABEL[v]}
                </option>
              ))}
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
          {debouncedSearch || status || insurance || puc ? 'No vehicles match those filters.' : 'No vehicles yet — add the first one to get started.'}
        </p>
      ) : null}

      {query.data && query.data.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-line bg-surface shadow-card">
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Vehicle</TableHeaderCell>
                  <TableHeaderCell>Owner</TableHeaderCell>
                  <TableHeaderCell>Registration</TableHeaderCell>
                  <TableHeaderCell>VIN</TableHeaderCell>
                  <TableHeaderCell>Insurance Expiry</TableHeaderCell>
                  <TableHeaderCell>PUC Expiry</TableHeaderCell>
                  <TableHeaderCell>Last Service</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {query.data.items.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-hover text-ink-secondary">
                          <Car className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        <div>
                          <Link href={`/vehicles/${vehicle.id}`} className="font-medium text-ink hover:text-accent-600">
                            {vehicle.brand} {vehicle.model}
                          </Link>
                          <p className="text-xs text-ink-muted">
                            {vehicle.manufactureYear ?? '—'} · {vehicle.fuelType ?? '—'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/customers/${vehicle.customerId}`} className="text-ink hover:text-accent-600">
                        {vehicle.customerName}
                      </Link>
                      <p className="text-xs text-ink-muted">{vehicle.customerMobile}</p>
                    </TableCell>
                    <TableCell className="num">{vehicle.registrationNo}</TableCell>
                    <TableCell className="num text-ink-secondary">{vehicle.vin ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <ExpiryCell date={vehicle.insuranceExpiry} status={vehicle.insuranceStatus} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <ExpiryCell date={vehicle.pucExpiry} status={vehicle.pucStatus} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-ink-secondary">
                      {vehicle.lastServiceAt ? (
                        <>
                          {formatDate(vehicle.lastServiceAt)}
                          <br />
                          <span className="text-xs text-ink-muted">
                            {vehicle.lastServiceOdometer !== null ? `${formatNumber(vehicle.lastServiceOdometer)} km` : ''}
                          </span>
                        </>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge tone={STATUS_TONE[vehicle.status]}>{STATUS_LABEL[vehicle.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/vehicles/${vehicle.id}`}
                          aria-label={`View ${vehicle.registrationNo}`}
                          title="View"
                          className="inline-flex h-7 w-7 items-center justify-center rounded text-ink-secondary hover:bg-surface-hover hover:text-ink"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                        {canUpdate ? (
                          <Link
                            href={`/vehicles/${vehicle.id}/edit`}
                            aria-label={`Edit ${vehicle.registrationNo}`}
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
