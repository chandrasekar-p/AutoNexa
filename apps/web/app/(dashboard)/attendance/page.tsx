'use client';

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Download,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock3,
  CalendarOff,
  HelpCircle,
  Users,
  ChevronDown,
  ChevronUp,
  UsersRound,
  UploadCloud,
  Settings2,
  ChevronRight,
} from 'lucide-react';
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { usePermission } from '@/lib/hooks/use-permission';
import { useStaffOptions } from '@/lib/hooks/use-staff-options';
import { formatDate, formatTime, formatHoursMinutesCompact } from '@/lib/format';
import { resolveDateRangePreset, type DateRangePresetKey } from '@/lib/reports/date-range-presets';
import { resolveThisWeekRange } from '@/lib/attendance/this-week-range';
import { exportRowsAsCsv } from '@/lib/export/csv';
import type { AttendanceRecord, AttendanceStatus, AttendanceSummary, PaginatedResult, Technician, UserProfile } from '@/lib/api-types';
import { AttendanceStatusBadge, ATTENDANCE_STATUS_LABEL } from '@/components/domain/attendance-status-badge';
import { AttendanceActionsMenu } from '@/components/domain/attendance-actions-menu';
import { KpiCard } from '@/components/domain/kpi-card';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { TimePicker } from '@/components/ui/time-picker';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Toast } from '@/components/ui/toast';
import { Drawer } from '@/components/ui/drawer';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const PAGE_SIZE = 10;
const STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE'];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Combines a date (YYYY-MM-DD) with a <input type="time"> value (HH:MM) into an ISO datetime the backend's @IsDateString() fields accept. */
function combineDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

function toTimeInputValue(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Notes placeholder adapts per status — the real ask behind spec §4's "late reason"/"half-day reason"/"leave type" fields, none of which exist as their own columns; the one real `notes` field carries the same intent honestly. */
const NOTES_PLACEHOLDER: Record<AttendanceStatus, string> = {
  PRESENT: 'Optional notes…',
  ABSENT: 'Reason for absence (optional)',
  HALF_DAY: 'Half-day reason (optional)',
  ON_LEAVE: 'Leave details (optional)',
};

interface MarkAttendanceFormProps {
  editing: AttendanceRecord | null;
  onSaved: (message: string) => void;
  onCancelEdit: () => void;
}

function MarkAttendanceForm({ editing, onSaved, onCancelEdit }: MarkAttendanceFormProps) {
  const staff = useStaffOptions();
  const [userId, setUserId] = useState(editing?.user?.id ?? '');
  const [date, setDate] = useState(editing ? editing.date.slice(0, 10) : todayISO());
  const [status, setStatus] = useState<AttendanceStatus>(editing?.status ?? 'PRESENT');
  const [checkInAt, setCheckInAt] = useState(editing?.checkInAt ? toTimeInputValue(editing.checkInAt) : '');
  const [checkOutAt, setCheckOutAt] = useState(editing?.checkOutAt ? toTimeInputValue(editing.checkOutAt) : '');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showCheckTimes = status === 'PRESENT' || status === 'HALF_DAY';
  const canSubmit = editing ? true : Boolean(userId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) {
      setError('Select a staff member.');
      return;
    }
    setIsSaving(true);
    setError(null);
    const payload = {
      status,
      checkInAt: showCheckTimes && checkInAt ? combineDateTime(date, checkInAt) : undefined,
      checkOutAt: showCheckTimes && checkOutAt ? combineDateTime(date, checkOutAt) : undefined,
      notes: notes.trim() || undefined,
    };
    try {
      if (editing) {
        await apiPatch(`/attendance/${editing.id}`, payload);
        onSaved('Attendance updated successfully.');
      } else {
        await apiPost('/attendance', { userId, date, ...payload });
        setNotes('');
        onSaved('Attendance saved successfully.');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save attendance.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editing ? 'Edit Attendance' : 'Mark Attendance'}</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-4 pt-3">
        <p className="text-xs text-ink-muted">
          {editing
            ? 'Staff member and date can’t be changed here — remove and re-mark if you picked the wrong one.'
            : 'Record or update attendance for a staff member. Marking a day that already has a record corrects it — the same staff member + date updates the existing entry rather than creating a duplicate.'}
        </p>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Select label="Staff" value={userId} onChange={(e) => setUserId(e.target.value)} disabled={!staff.isAvailable || !!editing} required>
              <option value="">Select staff member…</option>
              {staff.options.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!!editing} required />
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ATTENDANCE_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </div>

          {showCheckTimes ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TimePicker label="Check In" format="24h" value={checkInAt} onChange={setCheckInAt} />
              <TimePicker label="Check Out" format="24h" value={checkOutAt} onChange={setCheckOutAt} />
            </div>
          ) : (
            <p className="text-xs text-ink-muted">Check in/out isn’t tracked for {ATTENDANCE_STATUS_LABEL[status].toLowerCase()}.</p>
          )}

          <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={NOTES_PLACEHOLDER[status]} rows={2} />

          {error ? (
            <p role="alert" className="text-xs text-danger-600 dark:text-danger-400">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-3">
            {editing ? (
              <Button type="button" variant="secondary" size="sm" onClick={onCancelEdit} disabled={isSaving}>
                Cancel
              </Button>
            ) : null}
            <Button type="submit" size="sm" isLoading={isSaving} disabled={!canSubmit}>
              {editing ? 'Save Attendance' : 'Save Attendance'}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function QuickActionRow({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex cursor-not-allowed items-center gap-3 rounded-md border border-line bg-surface-hover/40 px-3 py-2.5 opacity-60">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-hover text-ink-secondary">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium text-ink">{title}</span>
          <Badge tone="neutral" className="shrink-0 whitespace-nowrap">
            Coming soon
          </Badge>
        </div>
        <p className="text-xs text-ink-muted">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
    </div>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-micro font-semibold uppercase tracking-wide text-ink-secondary">{label}</span>
      <span className="text-sm text-ink">{value}</span>
    </div>
  );
}

export default function AttendancePage() {
  const canMark = usePermission('attendance:create');
  const canUpdate = usePermission('attendance:update');
  const canDelete = usePermission('attendance:delete');
  const canReadUsers = usePermission('user:read');
  const canReadTechnicians = usePermission('technician:read');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AttendanceStatus | ''>('');
  const [department, setDepartment] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [activePreset, setActivePreset] = useState<'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | ''>('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<AttendanceRecord | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const summary = useApiQuery<AttendanceSummary>(() => apiGet('/attendance/summary'), []);
  const users = useApiQuery<UserProfile[]>(() => (canReadUsers ? apiGet('/users') : Promise.reject(new Error('n/a'))), [canReadUsers]);
  const technicians = useApiQuery<PaginatedResult<Technician>>(
    () => (canReadTechnicians ? apiGet('/technicians?pageSize=100') : Promise.reject(new Error('n/a'))),
    [canReadTechnicians],
  );

  const usersById = useMemo(() => new Map((users.data ?? []).map((u) => [u.id, u])), [users.data]);
  const employeeIdByUserId = useMemo(
    () => new Map((technicians.data?.items ?? []).map((t) => [t.userId, t.employeeId])),
    [technicians.data],
  );
  const departmentOptions = useMemo(() => {
    const names = new Set<string>();
    (users.data ?? []).forEach((u) => u.roles.forEach((r) => names.add(r.role.name)));
    return Array.from(names).sort();
  }, [users.data]);

  // Department has no server-side column to filter on — when active, this
  // fetches the max page (100, this DTO's own cap) instead of the normal
  // pageSize so the client-side department facet can filter across the
  // full matching set before paginating locally, rather than silently
  // under-filtering just the currently-loaded server page.
  const effectivePageSize = department ? 100 : pageSize;

  const query = useApiQuery<PaginatedResult<AttendanceRecord>>(
    () => {
      const params = new URLSearchParams({ page: department ? '1' : String(page), pageSize: String(effectivePageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (status) params.set('status', status);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      return apiGet(`/attendance?${params.toString()}`);
    },
    [page, effectivePageSize, debouncedSearch, status, from, to, department],
  );

  const filteredItems = useMemo(() => {
    if (!query.data) return [];
    if (!department) return query.data.items;
    return query.data.items.filter((r) => {
      const u = r.user ? usersById.get(r.user.id) : undefined;
      return u?.roles.some((role) => role.role.name === department) ?? false;
    });
  }, [query.data, department, usersById]);

  const displayItems = department ? filteredItems.slice((page - 1) * pageSize, page * pageSize) : filteredItems;
  const displayTotal = department ? filteredItems.length : (query.data?.total ?? 0);
  const displayTotalPages = Math.max(Math.ceil(displayTotal / pageSize), 1);

  function resetPage() {
    setPage(1);
  }

  function handlePresetClick(key: 'today' | 'yesterday' | 'thisWeek' | 'thisMonth') {
    setActivePreset(key);
    const range = key === 'thisWeek' ? resolveThisWeekRange() : resolveDateRangePreset(key as DateRangePresetKey)!;
    setFrom(range.from);
    setTo(range.to);
    resetPage();
  }

  function handleTodayButton() {
    handlePresetClick('today');
  }

  function handleReset() {
    setSearch('');
    setStatus('');
    setDepartment('');
    setFrom('');
    setTo('');
    setActivePreset('');
    resetPage();
  }

  function handleKpiClick(next: AttendanceStatus) {
    setStatus((current) => (current === next ? '' : next));
    resetPage();
  }

  async function handleRemove(record: AttendanceRecord) {
    if (!window.confirm(`Remove the attendance record for ${record.user?.name ?? 'this staff member'} on ${formatDate(record.date)}?`)) return;
    try {
      await apiDelete(`/attendance/${record.id}`);
      setSuccessMessage('Attendance record removed.');
      query.refetch();
      summary.refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not remove this attendance record.');
    }
  }

  function handleSaved(message: string) {
    setSuccessMessage(message);
    setEditingRecord(null);
    query.refetch();
    summary.refetch();
  }

  function handleExport() {
    if (displayItems.length === 0) return;
    const columns = [
      { key: 'staff', label: 'Staff' },
      { key: 'department', label: 'Department' },
      { key: 'status', label: 'Status' },
      { key: 'checkIn', label: 'Check In' },
      { key: 'checkOut', label: 'Check Out' },
      { key: 'hours', label: 'Hours' },
      { key: 'markedBy', label: 'Marked By' },
    ];
    const rows = displayItems.map((r) => {
      const u = r.user ? usersById.get(r.user.id) : undefined;
      return {
        staff: r.user?.name ?? '—',
        department: u?.roles.map((role) => role.role.name).join(', ') || '—',
        status: ATTENDANCE_STATUS_LABEL[r.status],
        checkIn: r.checkInAt ? formatTime(r.checkInAt) : '—',
        checkOut: r.checkOutAt ? formatTime(r.checkOutAt) : '—',
        hours: computeHoursLabel(r),
        markedBy: r.markedBy?.name ?? 'Self',
      };
    });
    exportRowsAsCsv(columns, rows, `attendance-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  const hasActiveFilters = Boolean(debouncedSearch || status || department || from || to);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Attendance</h1>
          <p className="text-sm text-ink-secondary">Staff check-in / check-out history across the workshop.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleExport} disabled={displayItems.length === 0}>
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Export
          </Button>
          <Button type="button" size="sm" onClick={handleTodayButton}>
            <CalendarCheck className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Today
          </Button>
        </div>
      </div>

      {summary.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : null}
      {summary.error ? <ErrorState message={summary.error} onRetry={summary.refetch} /> : null}
      {summary.data ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <button type="button" onClick={() => handleKpiClick('PRESENT')} className="text-left">
            <KpiCard label="Present" value={summary.data.present} sublabel="Today" tone="teal" icon={<CheckCircle2 className="h-4 w-4" />} />
          </button>
          <button type="button" onClick={() => handleKpiClick('ABSENT')} className="text-left">
            <KpiCard label="Absent" value={summary.data.absent} sublabel="Today" tone="danger" icon={<XCircle className="h-4 w-4" />} />
          </button>
          <button type="button" onClick={() => handleKpiClick('HALF_DAY')} className="text-left">
            <KpiCard label="Half Day" value={summary.data.halfDay} sublabel="Today" tone="warning" icon={<Clock3 className="h-4 w-4" />} />
          </button>
          <button type="button" onClick={() => handleKpiClick('ON_LEAVE')} className="text-left">
            <KpiCard label="On Leave" value={summary.data.onLeave} sublabel="Today" tone="fuchsia" icon={<CalendarOff className="h-4 w-4" />} />
          </button>
          <KpiCard label="Not Marked" value={summary.data.notMarked} sublabel="Today" tone="blue" icon={<HelpCircle className="h-4 w-4" />} />
          <KpiCard label="Total Staff" value={summary.data.totalStaff} sublabel="Active Staff" tone="neutral" icon={<Users className="h-4 w-4" />} />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {canMark ? <MarkAttendanceForm editing={editingRecord} onSaved={handleSaved} onCancelEdit={() => setEditingRecord(null)} /> : null}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-2 pt-3">
            <QuickActionRow icon={<UsersRound className="h-4 w-4" aria-hidden />} title="Bulk Mark Attendance" description="Mark attendance for multiple staff at once" />
            <QuickActionRow icon={<UploadCloud className="h-4 w-4" aria-hidden />} title="Import Attendance" description="Import attendance from CSV / Excel file" />
            <QuickActionRow icon={<Settings2 className="h-4 w-4" aria-hidden />} title="Attendance Settings" description="Configure working hours & policies" />
          </CardBody>
        </Card>
      </div>

      {successMessage ? <Toast message={successMessage} onDismiss={() => setSuccessMessage(null)} /> : null}

      <Card>
        <CardBody className="flex flex-col gap-3 pt-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="max-w-sm flex-1">
              <Input value={search} onChange={(e) => { setSearch(e.target.value); resetPage(); }} placeholder="Search staff by name or ID…" aria-label="Search staff" />
            </div>
            <div className="w-40">
              <Select value={status} onChange={(e) => { setStatus(e.target.value as AttendanceStatus | ''); resetPage(); }} aria-label="Filter by status">
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ATTENDANCE_STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </div>
            {departmentOptions.length > 0 ? (
              <div className="w-44">
                <Select value={department} onChange={(e) => { setDepartment(e.target.value); resetPage(); }} aria-label="Filter by department">
                  <option value="">All departments</option>
                  {departmentOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowMoreFilters((v) => !v)}>
              Filters
              {showMoreFilters ? <ChevronUp className="ml-1.5 h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="ml-1.5 h-3.5 w-3.5" aria-hidden />}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={handleReset} disabled={!hasActiveFilters}>
              Reset
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['today', 'yesterday', 'thisWeek', 'thisMonth'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handlePresetClick(key)}
                className={
                  activePreset === key
                    ? 'rounded-md border border-accent-400 bg-accent-50 px-2.5 py-1 text-xs font-medium text-accent-600 dark:bg-accent-500/15 dark:text-accent-400'
                    : 'rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink-secondary hover:bg-surface-hover'
                }
              >
                {key === 'today' ? 'Today' : key === 'yesterday' ? 'Yesterday' : key === 'thisWeek' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>

          {showMoreFilters ? (
            <div className="flex flex-wrap items-end gap-3 border-t border-line pt-3">
              <Input label="From Date" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setActivePreset(''); resetPage(); }} className="w-40" />
              <Input label="To Date" type="date" value={to} onChange={(e) => { setTo(e.target.value); setActivePreset(''); resetPage(); }} className="w-40" />
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

      {query.data && displayItems.length === 0 && !hasActiveFilters ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-5 py-14 text-center">
          <CalendarCheck className="h-8 w-8 text-ink-muted" aria-hidden />
          <div>
            <p className="text-sm font-medium text-ink">No attendance records yet</p>
            <p className="text-xs text-ink-muted">Mark attendance for a staff member to get started.</p>
          </div>
        </div>
      ) : null}

      {query.data && displayItems.length === 0 && hasActiveFilters ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-5 py-14 text-center">
          <CalendarCheck className="h-8 w-8 text-ink-muted" aria-hidden />
          <div>
            <p className="text-sm font-medium text-ink">No attendance records found</p>
            <p className="text-xs text-ink-muted">Try changing the date or filters.</p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={handleReset}>
            Reset Filters
          </Button>
        </div>
      ) : null}

      {query.data && displayItems.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface shadow-card sm:block">
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Staff</TableHeaderCell>
                  <TableHeaderCell>Department</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Check In</TableHeaderCell>
                  <TableHeaderCell>Check Out</TableHeaderCell>
                  <TableHeaderCell>Hours</TableHeaderCell>
                  <TableHeaderCell>Marked By</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {displayItems.map((record) => {
                  const u = record.user ? usersById.get(record.user.id) : undefined;
                  const employeeId = record.user ? employeeIdByUserId.get(record.user.id) : null;
                  const departmentLabel = u?.roles.map((r) => r.role.name).join(', ');
                  return (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={record.user?.name ?? '?'} photoUrl={u?.avatarUrl} size="sm" />
                          <div>
                            <p className="font-medium text-ink">{record.user?.name ?? '—'}</p>
                            {employeeId ? <p className="num text-xs text-ink-muted">{employeeId}</p> : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-ink-secondary">{departmentLabel || '—'}</TableCell>
                      <TableCell>
                        <AttendanceStatusBadge status={record.status} />
                      </TableCell>
                      <TableCell className="num text-ink-secondary">{record.checkInAt ? formatTime(record.checkInAt) : '—'}</TableCell>
                      <TableCell className="num text-ink-secondary">{record.checkOutAt ? formatTime(record.checkOutAt) : '—'}</TableCell>
                      <TableCell className="num text-ink-secondary">{computeHoursLabel(record)}</TableCell>
                      <TableCell>
                        <p className="text-ink-secondary">{record.markedBy?.name ?? 'Self'}</p>
                        <p className="text-xs text-ink-muted">{formatDate(record.updatedAt)}</p>
                      </TableCell>
                      <TableCell>
                        <AttendanceActionsMenu
                          canRemove={canDelete}
                          onView={() => setViewingRecord(record)}
                          onEdit={() => setEditingRecord(record)}
                          onRemove={() => handleRemove(record)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:hidden">
            {displayItems.map((record) => {
              const u = record.user ? usersById.get(record.user.id) : undefined;
              return (
                <div key={record.id} className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface p-3 shadow-panel">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={record.user?.name ?? '?'} photoUrl={u?.avatarUrl} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-ink">{record.user?.name ?? '—'}</p>
                        <p className="text-xs text-ink-secondary">{formatDate(record.date)}</p>
                      </div>
                    </div>
                    <AttendanceStatusBadge status={record.status} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-ink-secondary">
                    <span className="num">{record.checkInAt ? formatTime(record.checkInAt) : '—'} → {record.checkOutAt ? formatTime(record.checkOutAt) : '—'}</span>
                    <span className="num">{computeHoursLabel(record)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-line pt-2">
                    <span className="text-xs text-ink-muted">Marked by {record.markedBy?.name ?? 'Self'}</span>
                    <AttendanceActionsMenu
                      canRemove={canDelete}
                      onView={() => setViewingRecord(record)}
                      onEdit={() => setEditingRecord(record)}
                      onRemove={() => handleRemove(record)}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            page={page}
            totalPages={displayTotalPages}
            total={displayTotal}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>
      ) : null}

      {viewingRecord ? (
        <Drawer title="Attendance Details" onClose={() => setViewingRecord(null)}>
          <div className="flex flex-col gap-4">
            <Field label="Staff" value={viewingRecord.user?.name ?? '—'} />
            <Field label="Date" value={formatDate(viewingRecord.date)} />
            <Field label="Status" value={<AttendanceStatusBadge status={viewingRecord.status} />} />
            <Field label="Check In" value={viewingRecord.checkInAt ? formatTime(viewingRecord.checkInAt) : '—'} />
            <Field label="Check Out" value={viewingRecord.checkOutAt ? formatTime(viewingRecord.checkOutAt) : '—'} />
            <Field label="Total Hours" value={computeHoursLabel(viewingRecord)} />
            <Field label="Notes" value={viewingRecord.notes || '—'} />
            <Field label="Marked By" value={viewingRecord.markedBy?.name ?? 'Self'} />
            {canUpdate ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setEditingRecord(viewingRecord);
                  setViewingRecord(null);
                }}
              >
                Edit Attendance
              </Button>
            ) : null}
          </div>
        </Drawer>
      ) : null}
    </div>
  );
}

/** checkOut - checkIn when both exist; "In Progress" (never a fabricated default duration) when only checkIn exists; "—" otherwise. */
function computeHoursLabel(record: AttendanceRecord): string {
  if (!record.checkInAt) return '—';
  if (!record.checkOutAt) return 'In Progress';
  const minutes = Math.max(Math.round((new Date(record.checkOutAt).getTime() - new Date(record.checkInAt).getTime()) / 60000), 0);
  return formatHoursMinutesCompact(minutes);
}
