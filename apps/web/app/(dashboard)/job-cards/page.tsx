'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { List, LayoutGrid, ClipboardList, Search, Hourglass, Wrench, PackageSearch, ShieldCheck, Truck, XCircle } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { usePermission } from '@/lib/hooks/use-permission';
import { useStaffOptions } from '@/lib/hooks/use-staff-options';
import { cn } from '@/lib/cn';
import type { JobCardListItem, JobCardStatus, JobCardSummary, PaginatedResult, Technician } from '@/lib/api-types';
import { formatDate, formatNumber } from '@/lib/format';
import { VEHICLE_BRANDS } from '@/lib/data/vehicle-brands';
import { JobCardStatusBadge } from '@/components/domain/job-card-status-badge';
import { JobCardPriorityBadge } from '@/components/domain/job-card-priority-badge';
import { JobCardKanbanBoard } from '@/components/domain/job-card-kanban-board';
import { KpiCard } from '@/components/domain/kpi-card';
import { Card, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const PAGE_SIZE = 20;
// The board shows every matching job card as columns, not a paginated
// slice — 20-at-a-time would split single statuses across pages, which
// defeats the point of a board. 100 is the backend's own hard cap
// (ListJobCardsQueryDto's @Max(100)) — asking for more 400s outright.
const BOARD_PAGE_SIZE = 100;
const STATUSES: JobCardStatus[] = [
  'OPEN',
  'DIAGNOSIS',
  'WAITING_APPROVAL',
  'APPROVED',
  'IN_PROGRESS',
  'WAITING_PARTS',
  'QUALITY_CHECK',
  'READY_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];
const STATUS_LABEL: Record<JobCardStatus, string> = {
  OPEN: 'Open',
  DIAGNOSIS: 'Diagnosis',
  WAITING_APPROVAL: 'Waiting Approval',
  APPROVED: 'Approved',
  IN_PROGRESS: 'In Progress',
  WAITING_PARTS: 'Waiting Parts',
  QUALITY_CHECK: 'Quality Check',
  READY_FOR_DELIVERY: 'Ready for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

type QuickFilter = 'mine' | 'today' | 'delayed' | 'waitingApproval' | null;

export default function JobCardsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canCreate = usePermission('job-card:create');
  const canUpdate = usePermission('job-card:update');
  const canReadTechnicians = usePermission('technician:read');
  const staff = useStaffOptions();
  // JobCard.technicianId references Technician.id, not User.id — the
  // technician filter dropdown needs the actual technician roster, not
  // useStaffOptions() (which is GET /users and would silently never match
  // anything if used here, unlike the Advisor filter below where
  // serviceAdvisorId genuinely does reference User directly).
  const technicians = useApiQuery<PaginatedResult<Technician>>(
    () => (canReadTechnicians ? apiGet('/technicians?pageSize=100') : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 100, totalPages: 0 })),
    [canReadTechnicians],
  );

  // Arriving from a technician's "View Jobs" quick action pre-filters to
  // that technician and switches to List view (the board already has its
  // own dedicated column per status, so a technician filter reads better
  // as a flat filtered list than as 9 mostly-empty board columns).
  const preselectedTechnicianId = searchParams.get('technicianId');

  const [view, setView] = useState<'list' | 'board'>(preselectedTechnicianId ? 'list' : 'board');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<JobCardStatus | ''>('');
  const [technicianId, setTechnicianId] = useState(preselectedTechnicianId ?? '');
  const [serviceAdvisorId, setServiceAdvisorId] = useState('');
  const [brand, setBrand] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const summary = useApiQuery<JobCardSummary>(() => apiGet('/job-cards/summary'), []);

  const query = useApiQuery<PaginatedResult<JobCardListItem>>(
    () => {
      const params = new URLSearchParams({
        page: String(view === 'board' ? 1 : page),
        pageSize: String(view === 'board' ? BOARD_PAGE_SIZE : PAGE_SIZE),
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      // The board already segments by status via its columns — a status
      // filter on top would just empty out every column but one.
      if (status && view === 'list') params.set('status', status);
      if (technicianId) params.set('technicianId', technicianId);
      if (serviceAdvisorId) params.set('serviceAdvisorId', serviceAdvisorId);
      if (brand) params.set('brand', brand);
      if (quickFilter === 'mine') params.set('mine', 'true');
      if (quickFilter === 'today') params.set('dueDate', 'today');
      if (quickFilter === 'delayed') params.set('dueDate', 'delayed');
      if (quickFilter === 'waitingApproval' && view === 'list') params.set('status', 'WAITING_APPROVAL');
      return apiGet(`/job-cards?${params.toString()}`);
    },
    [view, page, debouncedSearch, status, technicianId, serviceAdvisorId, brand, quickFilter],
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleReset() {
    setSearch('');
    setStatus('');
    setTechnicianId('');
    setServiceAdvisorId('');
    setBrand('');
    setQuickFilter(null);
    setPage(1);
  }

  function toggleQuickFilter(filter: QuickFilter) {
    setQuickFilter((current) => (current === filter ? null : filter));
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Job Cards</h1>
          <p className="text-sm text-ink-secondary">Track every vehicle through the workshop pipeline.</p>
        </div>
        {canCreate ? (
          <Button onClick={() => router.push('/job-cards/new')}>
            <ClipboardList className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            New Job Card
          </Button>
        ) : null}
      </div>

      {summary.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : null}
      {summary.error ? <ErrorState message={summary.error} onRetry={summary.refetch} /> : null}
      {summary.data ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-8">
          <KpiCard label="Open" value={formatNumber(summary.data.open)} sublabel="Job cards" tone="neutral" icon={<ClipboardList className="h-4 w-4" />} />
          <KpiCard label="Diagnosis" value={formatNumber(summary.data.diagnosis)} sublabel="Job cards" tone="blue" icon={<Search className="h-4 w-4" />} />
          <KpiCard label="Waiting Approval" value={formatNumber(summary.data.waitingApproval)} sublabel="Job cards" tone="warning" icon={<Hourglass className="h-4 w-4" />} />
          <KpiCard label="In Progress" value={formatNumber(summary.data.inProgress)} sublabel="Job cards" tone="accent" icon={<Wrench className="h-4 w-4" />} />
          <KpiCard label="Waiting Parts" value={formatNumber(summary.data.waitingParts)} sublabel="Job cards" tone="fuchsia" icon={<PackageSearch className="h-4 w-4" />} />
          <KpiCard label="Ready for Delivery" value={formatNumber(summary.data.readyForDelivery)} sublabel="Job cards" tone="teal" icon={<ShieldCheck className="h-4 w-4" />} />
          <KpiCard label="Delivered" value={formatNumber(summary.data.deliveredThisMonth)} sublabel="This month" tone="teal" icon={<Truck className="h-4 w-4" />} />
          <KpiCard label="Cancelled" value={formatNumber(summary.data.cancelled)} sublabel="Job cards" tone="danger" icon={<XCircle className="h-4 w-4" />} />
        </div>
      ) : null}

      <Card>
        <CardBody className="flex flex-col gap-3 pt-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="max-w-sm flex-1">
              <Input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search job card, customer, vehicle, registration…"
                aria-label="Search job cards"
              />
            </div>
            {view === 'list' ? (
              <div className="w-44">
                <Select value={status} onChange={(e) => { setStatus(e.target.value as JobCardStatus | ''); setPage(1); }} aria-label="Filter by status">
                  <option value="">All Statuses</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            {canReadTechnicians && technicians.data && technicians.data.items.length > 0 ? (
              <div className="w-40">
                <Select value={technicianId} onChange={(e) => { setTechnicianId(e.target.value); setPage(1); }} aria-label="Filter by technician">
                  <option value="">All Technicians</option>
                  {technicians.data.items.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.user.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            {staff.isAvailable ? (
              <div className="w-40">
                <Select value={serviceAdvisorId} onChange={(e) => { setServiceAdvisorId(e.target.value); setPage(1); }} aria-label="Filter by advisor">
                  <option value="">All Advisors</option>
                  {staff.options.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            <div className="w-44">
              <Select value={brand} onChange={(e) => { setBrand(e.target.value); setPage(1); }} aria-label="Filter by vehicle brand">
                <option value="">All Vehicle Brands</option>
                {VEHICLE_BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={handleReset}>
              Reset
            </Button>

            <div className="ml-auto flex rounded border border-line bg-surface p-0.5">
              <button
                type="button"
                onClick={() => setView('list')}
                aria-pressed={view === 'list'}
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded px-3 text-xs font-medium transition-colors',
                  view === 'list' ? 'bg-accent-500 text-white' : 'text-ink-secondary hover:bg-surface-hover',
                )}
              >
                <List className="h-3.5 w-3.5" aria-hidden />
                List
              </button>
              <button
                type="button"
                onClick={() => setView('board')}
                aria-pressed={view === 'board'}
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded px-3 text-xs font-medium transition-colors',
                  view === 'board' ? 'bg-accent-500 text-white' : 'text-ink-secondary hover:bg-surface-hover',
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                Board
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ['mine', 'My Jobs'],
                ['today', 'Today'],
                ['delayed', 'Delayed'],
                ['waitingApproval', 'Waiting Approval'],
              ] as [Exclude<QuickFilter, null>, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleQuickFilter(key)}
                aria-pressed={quickFilter === key}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  quickFilter === key
                    ? 'border-accent-400 bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-400'
                    : 'border-line text-ink-secondary hover:bg-surface-hover',
                )}
              >
                {label}
              </button>
            ))}
          </div>
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
          No job cards match those filters.
        </p>
      ) : null}

      {query.data && query.data.items.length > 0 && view === 'board' ? (
        <JobCardKanbanBoard items={query.data.items} canUpdate={canUpdate} onStatusChanged={query.refetch} />
      ) : null}

      {query.data && query.data.items.length > 0 && view === 'list' ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-line bg-surface shadow-card">
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Job Card #</TableHeaderCell>
                  <TableHeaderCell>Customer</TableHeaderCell>
                  <TableHeaderCell>Vehicle</TableHeaderCell>
                  <TableHeaderCell>Priority</TableHeaderCell>
                  <TableHeaderCell>Expected Delivery</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {query.data.items.map((jobCard) => (
                  <TableRow key={jobCard.id}>
                    <TableCell className="num font-medium">
                      <Link href={`/job-cards/${jobCard.id}`} className="hover:text-accent-600">
                        {jobCard.jobCardNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-ink-secondary">{jobCard.customer.name}</TableCell>
                    <TableCell className="num text-ink-secondary">{jobCard.vehicle.registrationNo}</TableCell>
                    <TableCell>
                      <JobCardPriorityBadge priority={jobCard.priority} />
                    </TableCell>
                    <TableCell className="text-ink-secondary">
                      {jobCard.expectedDelivery ? formatDate(jobCard.expectedDelivery) : '—'}
                    </TableCell>
                    <TableCell>
                      <JobCardStatusBadge status={jobCard.status} />
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
