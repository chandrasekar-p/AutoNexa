'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { List, LayoutGrid, Plus, Users, UserCheck, Wrench, UserMinus, UserX } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { usePermission } from '@/lib/hooks/use-permission';
import { cn } from '@/lib/cn';
import type { PaginatedResult, Technician, TechnicianStatus, TechnicianSummary } from '@/lib/api-types';
import { formatNumber } from '@/lib/format';
import { TECHNICIAN_SPECIALISATIONS } from '@/lib/data/technician-specialisations';
import { TechnicianStatusBadge } from '@/components/domain/technician-status-badge';
import { TechnicianAvailabilityBadge } from '@/components/domain/technician-availability-badge';
import { TechnicianActionsMenu } from '@/components/domain/technician-actions-menu';
import { TechnicianCard } from '@/components/domain/technician-card';
import { TechnicianBoard } from '@/components/domain/technician-board';
import { WorkloadBar } from '@/components/domain/workload-bar';
import { KpiCard } from '@/components/domain/kpi-card';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const PAGE_SIZE = 10;
const BOARD_PAGE_SIZE = 100;

export default function TechniciansPage() {
  const router = useRouter();
  const canCreate = usePermission('technician:create');
  const canUpdate = usePermission('technician:update');

  const [view, setView] = useState<'list' | 'board'>('list');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TechnicianStatus | ''>('');
  const [specialisation, setSpecialisation] = useState('');
  const [skill, setSkill] = useState('');
  const [workload, setWorkload] = useState<'available' | 'busy' | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [actionError, setActionError] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const summary = useApiQuery<TechnicianSummary>(() => apiGet('/technicians/summary'), []);

  const query = useApiQuery<PaginatedResult<Technician>>(
    () => {
      const params = new URLSearchParams({
        page: String(view === 'board' ? 1 : page),
        pageSize: String(view === 'board' ? BOARD_PAGE_SIZE : pageSize),
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (status) params.set('status', status);
      if (specialisation) params.set('specialisation', specialisation);
      if (skill) params.set('skill', skill);
      if (workload) params.set('workload', workload);
      return apiGet(`/technicians?${params.toString()}`);
    },
    [view, page, pageSize, debouncedSearch, status, specialisation, skill, workload],
  );

  const allSkills = Array.from(new Set((query.data?.items ?? []).flatMap((t) => t.skills))).sort();

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleReset() {
    setSearch('');
    setStatus('');
    setSpecialisation('');
    setSkill('');
    setWorkload('');
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Technicians</h1>
          <p className="text-sm text-ink-secondary">Manage your workshop team, skills and workload.</p>
        </div>
        {canCreate ? (
          <Button onClick={() => router.push('/technicians/new')}>
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            New Technician
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
          <KpiCard label="Active" value={formatNumber(summary.data.active)} sublabel="Technicians" tone="neutral" icon={<Users className="h-4 w-4" />} />
          <KpiCard label="Available" value={formatNumber(summary.data.available)} sublabel="Available Today" tone="teal" icon={<UserCheck className="h-4 w-4" />} />
          <KpiCard label="On Job" value={formatNumber(summary.data.onJob)} sublabel="Working Now" tone="warning" icon={<Wrench className="h-4 w-4" />} />
          <KpiCard label="On Leave" value={formatNumber(summary.data.onLeave)} sublabel="On Leave" tone="fuchsia" icon={<UserMinus className="h-4 w-4" />} />
          <KpiCard label="Inactive" value={formatNumber(summary.data.inactive)} sublabel="Inactive" tone="neutral" icon={<UserX className="h-4 w-4" />} />
        </div>
      ) : null}

      <Card>
        <CardBody className="flex flex-wrap items-end gap-3 pt-5">
          <div className="max-w-sm flex-1">
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search technician, employee ID, skill…"
              aria-label="Search technicians"
            />
          </div>
          <div className="w-40">
            <Select value={status} onChange={(e) => { setStatus(e.target.value as TechnicianStatus | ''); setPage(1); }} aria-label="Filter by status">
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </div>
          <div className="w-48">
            <Select value={specialisation} onChange={(e) => { setSpecialisation(e.target.value); setPage(1); }} aria-label="Filter by specialisation">
              <option value="">All Specialisations</option>
              {TECHNICIAN_SPECIALISATIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-40">
            <Select value={skill} onChange={(e) => { setSkill(e.target.value); setPage(1); }} aria-label="Filter by skill">
              <option value="">All Skills</option>
              {allSkills.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-36">
            <Select value={workload} onChange={(e) => { setWorkload(e.target.value as 'available' | 'busy' | ''); setPage(1); }} aria-label="Filter by workload">
              <option value="">Workload</option>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
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
              className={cn('flex h-8 items-center gap-1.5 rounded px-3 text-xs font-medium transition-colors', view === 'list' ? 'bg-accent-500 text-white' : 'text-ink-secondary hover:bg-surface-hover')}
            >
              <List className="h-3.5 w-3.5" aria-hidden />
              List
            </button>
            <button
              type="button"
              onClick={() => setView('board')}
              aria-pressed={view === 'board'}
              className={cn('flex h-8 items-center gap-1.5 rounded px-3 text-xs font-medium transition-colors', view === 'board' ? 'bg-accent-500 text-white' : 'text-ink-secondary hover:bg-surface-hover')}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
              Board
            </button>
          </div>
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

      {query.data && query.data.items.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface px-5 py-10 text-center text-sm text-ink-muted">
          No technicians match those filters.
        </p>
      ) : null}

      {query.data && query.data.items.length > 0 && view === 'board' ? (
        <TechnicianBoard items={query.data.items} canUpdate={canUpdate} onStatusChanged={query.refetch} onError={setActionError} />
      ) : null}

      {query.data && query.data.items.length > 0 && view === 'list' ? (
        <div className="flex flex-col gap-3">
          {/* Desktop/tablet table */}
          <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface shadow-card sm:block">
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Technician</TableHeaderCell>
                  <TableHeaderCell>Employee ID</TableHeaderCell>
                  <TableHeaderCell>Specialisation</TableHeaderCell>
                  <TableHeaderCell>Skills</TableHeaderCell>
                  <TableHeaderCell>Active Jobs</TableHeaderCell>
                  <TableHeaderCell>Workload</TableHeaderCell>
                  <TableHeaderCell>Today</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {query.data.items.map((technician) => (
                  <TableRow key={technician.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={technician.user.name} size="sm" />
                        <div>
                          <Link href={`/technicians/${technician.id}`} className="font-medium text-ink hover:text-accent-600">
                            {technician.user.name}
                          </Link>
                          <p className="num text-xs text-ink-muted">{technician.user.phone ?? '—'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="num text-ink-secondary">{technician.employeeId ?? '—'}</TableCell>
                    <TableCell className="text-ink-secondary">{technician.specialisation ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {technician.skills.slice(0, 3).map((skillTag) => (
                          <span key={skillTag} className="rounded-full bg-surface-hover px-2 py-0.5 text-micro font-medium text-ink-secondary">
                            {skillTag}
                          </span>
                        ))}
                        {technician.skills.length > 3 ? <span className="text-micro text-ink-muted">+{technician.skills.length - 3}</span> : null}
                      </div>
                    </TableCell>
                    <TableCell className="num text-ink">{technician.jobsOpen}</TableCell>
                    <TableCell className="w-32">
                      <WorkloadBar percent={technician.workloadPercent} />
                    </TableCell>
                    <TableCell className="num text-ink">{technician.todayCount}</TableCell>
                    <TableCell>
                      <TechnicianAvailabilityBadge availability={technician.availability} />
                    </TableCell>
                    <TableCell>
                      <TechnicianActionsMenu
                        technicianId={technician.id}
                        status={technician.status}
                        canUpdate={canUpdate}
                        onStatusChanged={query.refetch}
                        onError={setActionError}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile card list */}
          <div className="flex flex-col gap-3 sm:hidden">
            {query.data.items.map((technician) => (
              <TechnicianCard key={technician.id} technician={technician} canUpdate={canUpdate} onStatusChanged={query.refetch} onError={setActionError} />
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
