'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, CalendarClock, CalendarX, Car, CheckCircle2, Download, Eye, Pencil, Plus, UserX } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { usePermission } from '@/lib/hooks/use-permission';
import { exportRowsAsCsv } from '@/lib/export/csv';
import type { Appointment, AppointmentStatus, AppointmentSummary, PaginatedResult } from '@/lib/api-types';
import { daysUntil, formatDate, formatNumber, initialsFor } from '@/lib/format';
import { AppointmentStatusBadge, APPOINTMENT_STATUS_LABEL } from '@/components/domain/appointment-status-badge';
import { KpiCard } from '@/components/domain/kpi-card';
import { Card, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const DEFAULT_PAGE_SIZE = 10;
const STATUSES: AppointmentStatus[] = ['SCHEDULED', 'CONFIRMED', 'VEHICLE_RECEIVED', 'IN_SERVICE', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

/** "Today" / "Tomorrow" / "N days left" — same relative-date convention as the Vehicles list page's expiry columns. Blank for a past date (nothing useful to say there). */
function RelativeDateLabel({ date }: { date: string }) {
  const days = daysUntil(date);
  if (days === 0) return <span className="text-xs font-medium text-accent-600 dark:text-accent-400">Today</span>;
  if (days === 1) return <span className="text-xs font-medium text-ink-secondary">Tomorrow</span>;
  if (days > 1) return <span className="text-xs text-ink-muted">{days} days left</span>;
  return null;
}

export default function AppointmentsPage() {
  const router = useRouter();
  const canCreate = usePermission('appointment:create');
  const canUpdate = usePermission('appointment:update');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const debouncedSearch = useDebouncedValue(search);

  const summary = useApiQuery<AppointmentSummary>(() => apiGet('/appointments/summary'), []);

  const query = useApiQuery<PaginatedResult<Appointment>>(
    () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (status) params.set('status', status);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      return apiGet(`/appointments?${params.toString()}`);
    },
    [page, pageSize, debouncedSearch, status, from, to],
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleReset() {
    setSearch('');
    setStatus('');
    setFrom('');
    setTo('');
    setPage(1);
  }

  function handleExportCsv() {
    if (!query.data) return;
    const columns = [
      { key: 'dateTime', label: 'Date & Time' },
      { key: 'customer', label: 'Customer' },
      { key: 'vehicle', label: 'Vehicle' },
      { key: 'service', label: 'Service' },
      { key: 'advisor', label: 'Advisor' },
      { key: 'technician', label: 'Technician' },
      { key: 'status', label: 'Status' },
    ];
    const rows = query.data.items.map((a) => ({
      dateTime: `${formatDate(a.appointmentDate)} ${a.appointmentTime}`,
      customer: a.customer.name,
      vehicle: `${a.vehicle.registrationNo} — ${a.vehicle.brand} ${a.vehicle.model}`,
      service: a.serviceType,
      advisor: a.serviceAdvisor?.name ?? '—',
      technician: a.technician?.name ?? '—',
      status: APPOINTMENT_STATUS_LABEL[a.status],
    }));
    exportRowsAsCsv(columns, rows, `appointments-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Appointments</h1>
          <p className="text-sm text-ink-secondary">Every booked service appointment, soonest first.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleExportCsv} disabled={!query.data}>
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Export
          </Button>
          {canCreate ? (
            <Button type="button" size="sm" onClick={() => router.push('/appointments/new')}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              New Appointment
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
          <KpiCard label="Today" value={formatNumber(summary.data.today)} sublabel="Appointments" tone="accent" icon={<Calendar className="h-4 w-4" />} />
          <KpiCard label="Upcoming" value={formatNumber(summary.data.upcoming)} sublabel="Next 7 days" tone="blue" icon={<CalendarClock className="h-4 w-4" />} />
          <KpiCard label="Completed" value={formatNumber(summary.data.completed)} sublabel="This month" tone="teal" icon={<CheckCircle2 className="h-4 w-4" />} />
          <KpiCard label="Cancelled" value={formatNumber(summary.data.cancelled)} sublabel="This month" tone="warning" icon={<CalendarX className="h-4 w-4" />} />
          <KpiCard label="No Show" value={formatNumber(summary.data.noShow)} sublabel="This month" tone="danger" icon={<UserX className="h-4 w-4" />} />
        </div>
      ) : null}

      <Card>
        <CardBody className="flex flex-wrap items-end gap-3 pt-5">
          <div className="max-w-sm flex-1">
            <Input
              label="Search"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by service type or notes"
              aria-label="Search appointments"
            />
          </div>
          <div className="w-48">
            <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value as AppointmentStatus | ''); setPage(1); }}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {APPOINTMENT_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </div>
          <Input label="From Date" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="w-40" />
          <Input label="To Date" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="w-40" />
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
          {debouncedSearch || status || from || to ? 'No appointments match those filters.' : 'No appointments yet — book the first one to get started.'}
        </p>
      ) : null}

      {query.data && query.data.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-line bg-surface shadow-card">
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Date & Time</TableHeaderCell>
                  <TableHeaderCell>Customer</TableHeaderCell>
                  <TableHeaderCell>Vehicle</TableHeaderCell>
                  <TableHeaderCell>Service</TableHeaderCell>
                  <TableHeaderCell>Advisor / Technician</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {query.data.items.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell className="whitespace-nowrap">
                      <Link href={`/appointments/${appointment.id}`} className="num font-medium text-ink hover:text-accent-600">
                        {formatDate(appointment.appointmentDate)} · {appointment.appointmentTime}
                      </Link>
                      <div>
                        <RelativeDateLabel date={appointment.appointmentDate} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-500 text-micro font-semibold text-white">
                          {initialsFor(appointment.customer.name)}
                        </span>
                        <div>
                          <p className="text-ink">{appointment.customer.name}</p>
                          <p className="text-xs text-ink-muted">{appointment.customer.mobile}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Car className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden />
                        <div>
                          <p className="num text-ink">{appointment.vehicle.registrationNo}</p>
                          <p className="text-xs text-ink-muted">
                            {appointment.vehicle.brand} {appointment.vehicle.model}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-ink-secondary">{appointment.serviceType}</TableCell>
                    <TableCell className="text-xs">
                      <p className="text-ink-secondary">{appointment.serviceAdvisor?.name ?? '—'}</p>
                      <p className="text-ink-muted">{appointment.technician?.name ?? '—'}</p>
                    </TableCell>
                    <TableCell>
                      <AppointmentStatusBadge status={appointment.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/appointments/${appointment.id}`}
                          aria-label="View appointment"
                          title="View"
                          className="inline-flex h-7 w-7 items-center justify-center rounded text-ink-secondary hover:bg-surface-hover hover:text-ink"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                        {canUpdate ? (
                          <Link
                            href={`/appointments/${appointment.id}/edit`}
                            aria-label="Edit appointment"
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
