'use client';

import { useState, type FormEvent } from 'react';
import { apiDelete, apiGet, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { useStaffOptions } from '@/lib/hooks/use-staff-options';
import { formatDate, formatTime } from '@/lib/format';
import type { AttendanceRecord, AttendanceStatus, PaginatedResult } from '@/lib/api-types';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const PAGE_SIZE = 30;

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  HALF_DAY: 'Half Day',
  ON_LEAVE: 'On Leave',
};

const STATUS_TONE: Record<AttendanceStatus, 'success' | 'danger' | 'warning' | 'neutral'> = {
  PRESENT: 'success',
  ABSENT: 'danger',
  HALF_DAY: 'warning',
  ON_LEAVE: 'neutral',
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Combines a date (YYYY-MM-DD) with a <input type="time"> value (HH:MM) into an ISO datetime the backend's @IsDateString() fields accept. */
function combineDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

function MarkAttendanceForm({ onMarked }: { onMarked: () => void }) {
  const staff = useStaffOptions();
  const [userId, setUserId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [status, setStatus] = useState<AttendanceStatus>('PRESENT');
  const [checkInAt, setCheckInAt] = useState('');
  const [checkOutAt, setCheckOutAt] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) {
      setError('Select a staff member.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await apiPost('/attendance', {
        userId,
        date,
        status,
        checkInAt: checkInAt ? combineDateTime(date, checkInAt) : undefined,
        checkOutAt: checkOutAt ? combineDateTime(date, checkOutAt) : undefined,
        notes: notes.trim() || undefined,
      });
      setNotes('');
      onMarked();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not mark attendance.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mark Attendance</CardTitle>
      </CardHeader>
      <CardBody className="pt-3">
        <p className="mb-3 text-xs text-ink-muted">
          Marking a day that already has a record corrects it — same staff member + date updates the existing entry
          rather than creating a duplicate.
        </p>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select label="Staff" value={userId} onChange={(e) => setUserId(e.target.value)} disabled={!staff.isAvailable}>
              <option value="">Select…</option>
              {staff.options.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)}>
              {(Object.keys(STATUS_LABEL) as AttendanceStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
            <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            <Input label="Check In" type="time" value={checkInAt} onChange={(e) => setCheckInAt(e.target.value)} />
            <Input label="Check Out" type="time" value={checkOutAt} onChange={(e) => setCheckOutAt(e.target.value)} />
          </div>

          {error ? (
            <p role="alert" className="text-xs text-danger-600 dark:text-danger-400">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" size="sm" isLoading={isSaving}>
              Save
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

export default function AttendancePage() {
  const canMark = usePermission('attendance:create');
  const canDelete = usePermission('attendance:delete');
  const staff = useStaffOptions();

  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState<AttendanceStatus | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const query = useApiQuery<PaginatedResult<AttendanceRecord>>(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (userId) params.set('userId', userId);
    if (status) params.set('status', status);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return apiGet(`/attendance?${params.toString()}`);
  }, [page, userId, status, from, to]);

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this attendance record?')) return;
    try {
      await apiDelete(`/attendance/${id}`);
      query.refetch();
    } catch {
      // Surfaced via the table staying put — a stray failure here isn't worth its own error banner.
    }
  }

  function resetPageAnd<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Attendance</h1>
        <p className="text-sm text-ink-secondary">Staff check-in/out history across the workshop.</p>
      </div>

      {canMark ? <MarkAttendanceForm onMarked={query.refetch} /> : null}

      <div className="flex flex-wrap gap-3">
        <div className="w-52">
          <Select value={userId} onChange={(e) => resetPageAnd(setUserId)(e.target.value)} aria-label="Filter by staff" disabled={!staff.isAvailable}>
            <option value="">All staff</option>
            {staff.options.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select
            value={status}
            onChange={(e) => resetPageAnd(setStatus)(e.target.value as AttendanceStatus | '')}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {(Object.keys(STATUS_LABEL) as AttendanceStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>
        <Input type="date" value={from} onChange={(e) => resetPageAnd(setFrom)(e.target.value)} className="w-40" aria-label="From date" />
        <Input type="date" value={to} onChange={(e) => resetPageAnd(setTo)(e.target.value)} className="w-40" aria-label="To date" />
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
          No attendance records match those filters.
        </p>
      ) : null}

      {query.data && query.data.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-line bg-surface shadow-card">
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Staff</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Check In</TableHeaderCell>
                  <TableHeaderCell>Check Out</TableHeaderCell>
                  <TableHeaderCell>Marked By</TableHeaderCell>
                  {canDelete ? <TableHeaderCell>&nbsp;</TableHeaderCell> : null}
                </tr>
              </TableHead>
              <TableBody>
                {query.data.items.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-ink-secondary">{formatDate(record.date)}</TableCell>
                    <TableCell className="text-ink">{record.user?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge tone={STATUS_TONE[record.status]}>{STATUS_LABEL[record.status]}</Badge>
                    </TableCell>
                    <TableCell className="num text-ink-secondary">{record.checkInAt ? formatTime(record.checkInAt) : '—'}</TableCell>
                    <TableCell className="num text-ink-secondary">{record.checkOutAt ? formatTime(record.checkOutAt) : '—'}</TableCell>
                    <TableCell className="text-ink-secondary">{record.markedBy?.name ?? 'Self'}</TableCell>
                    {canDelete ? (
                      <TableCell className="text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(record.id)}
                          className="text-xs text-danger-600 hover:underline dark:text-danger-400"
                        >
                          Remove
                        </button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={query.data.page} totalPages={query.data.totalPages} total={query.data.total} onPageChange={setPage} />
        </div>
      ) : null}
    </div>
  );
}
