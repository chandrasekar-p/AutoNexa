'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, Plus, UserRound, ChevronDown, ChevronUp } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { usePermission } from '@/lib/hooks/use-permission';
import { formatLastLogin } from '@/lib/format';
import { exportRowsAsCsv } from '@/lib/export/csv';
import type { AppUser, Role } from '@/lib/api-types';
import { UserStatusBadge } from '@/components/domain/user-status-badge';
import { RoleBadgeList } from '@/components/domain/role-badge-list';
import { UserActionsMenu } from '@/components/domain/user-actions-menu';
import { KpiCard } from '@/components/domain/kpi-card';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardBody } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Toast } from '@/components/ui/toast';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const PAGE_SIZE = 10;

/** Named for the roles a workshop typically hands ownership/admin duties to — the app has no separate "isAdmin" flag, only role names. */
const ADMIN_ROLE_NAMES = new Set(['Workshop Owner', 'Workshop Manager']);

type StatusFilter = 'all' | 'active' | 'inactive' | 'admin';

export default function UsersPage() {
  const router = useRouter();
  const canCreate = usePermission('user:create');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const query = useApiQuery<AppUser[]>(() => apiGet('/users'), []);
  const roles = useApiQuery<Role[]>(() => apiGet('/roles'), []);

  const users = query.data ?? [];
  const kpis = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.isActive).length,
      inactive: users.filter((u) => !u.isActive).length,
      admin: users.filter((u) => u.roles.some((r) => ADMIN_ROLE_NAMES.has(r.role.name))).length,
    }),
    [users],
  );

  function resetPage() {
    setPage(1);
  }

  function handleKpiClick(next: StatusFilter) {
    setStatusFilter((current) => (current === next ? 'all' : next));
    resetPage();
  }

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      if (roleFilter && !u.roles.some((r) => r.role.id === roleFilter)) return false;
      if (statusFilter === 'active' && !u.isActive) return false;
      if (statusFilter === 'inactive' && u.isActive) return false;
      if (statusFilter === 'admin' && !u.roles.some((r) => ADMIN_ROLE_NAMES.has(r.role.name))) return false;
      return true;
    });
  }, [users, debouncedSearch, roleFilter, statusFilter]);

  const totalPages = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const displayItems = filtered.slice((page - 1) * pageSize, page * pageSize);
  const hasActiveFilters = Boolean(debouncedSearch || roleFilter || statusFilter !== 'all');

  function handleReset() {
    setSearch('');
    setRoleFilter('');
    setStatusFilter('all');
    resetPage();
  }

  function handleExport() {
    if (filtered.length === 0) return;
    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'roles', label: 'Roles' },
      { key: 'status', label: 'Status' },
      { key: 'lastLogin', label: 'Last Login' },
    ];
    const rows = filtered.map((u) => ({
      name: u.name,
      email: u.email,
      phone: u.phone ?? '—',
      roles: u.roles.map((r) => r.role.name).join(', ') || '—',
      status: u.isActive ? 'Active' : 'Inactive',
      lastLogin: u.lastLoginAt ? formatLastLogin(u.lastLoginAt) : 'Never',
    }));
    exportRowsAsCsv(columns, rows, `users-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Users</h1>
          <p className="text-sm text-ink-secondary">Manage workshop staff accounts, roles, and access.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Export
          </Button>
          {canCreate ? (
            <Button type="button" size="sm" onClick={() => router.push('/users/new')}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              New User
            </Button>
          ) : null}
        </div>
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : null}
      {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}
      {query.data ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <button type="button" onClick={() => handleKpiClick('all')} className="text-left">
            <KpiCard label="Total Users" value={kpis.total} tone="neutral" icon={<UserRound className="h-4 w-4" />} />
          </button>
          <button type="button" onClick={() => handleKpiClick('active')} className="text-left">
            <KpiCard label="Active" value={kpis.active} tone="teal" icon={<UserRound className="h-4 w-4" />} />
          </button>
          <button type="button" onClick={() => handleKpiClick('inactive')} className="text-left">
            <KpiCard label="Inactive" value={kpis.inactive} tone="danger" icon={<UserRound className="h-4 w-4" />} />
          </button>
          <button type="button" onClick={() => handleKpiClick('admin')} className="text-left">
            <KpiCard label="Admin / Manager" value={kpis.admin} tone="blue" icon={<UserRound className="h-4 w-4" />} />
          </button>
        </div>
      ) : null}

      {successMessage ? <Toast message={successMessage} onDismiss={() => setSuccessMessage(null)} /> : null}

      <Card>
        <CardBody className="flex flex-col gap-3 pt-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="max-w-sm flex-1">
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  resetPage();
                }}
                placeholder="Search by name or email…"
                aria-label="Search users"
              />
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowMoreFilters((v) => !v)}>
              Filters
              {showMoreFilters ? <ChevronUp className="ml-1.5 h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="ml-1.5 h-3.5 w-3.5" aria-hidden />}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={handleReset} disabled={!hasActiveFilters}>
              Reset
            </Button>
          </div>

          {showMoreFilters ? (
            <div className="flex flex-wrap items-end gap-3 border-t border-line pt-3">
              <div className="w-52">
                <Select
                  label="Role"
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    resetPage();
                  }}
                >
                  <option value="">All roles</option>
                  {(roles.data ?? []).map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-40">
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as StatusFilter);
                    resetPage();
                  }}
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
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

      {query.data && displayItems.length === 0 && !hasActiveFilters ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-5 py-14 text-center">
          <UserRound className="h-8 w-8 text-ink-muted" aria-hidden />
          <div>
            <p className="text-sm font-medium text-ink">No users yet</p>
            <p className="text-xs text-ink-muted">Create a staff account to get started.</p>
          </div>
        </div>
      ) : null}

      {query.data && displayItems.length === 0 && hasActiveFilters ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-5 py-14 text-center">
          <UserRound className="h-8 w-8 text-ink-muted" aria-hidden />
          <div>
            <p className="text-sm font-medium text-ink">No users found</p>
            <p className="text-xs text-ink-muted">Try changing your search or filters.</p>
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
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>Roles</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {displayItems.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <Link href={`/users/${user.id}`} className="flex items-center gap-2.5 hover:text-accent-600">
                        <Avatar name={user.name} photoUrl={user.avatarUrl} size="sm" />
                        <div>
                          <p className="text-ink">{user.name}</p>
                          <p className="text-xs font-normal text-ink-muted">
                            {user.lastLoginAt ? `Last login: ${formatLastLogin(user.lastLoginAt)}` : 'Never logged in'}
                          </p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-ink-secondary">{user.email}</TableCell>
                    <TableCell>
                      <RoleBadgeList roles={user.roles} />
                    </TableCell>
                    <TableCell>
                      <UserStatusBadge isActive={user.isActive} />
                    </TableCell>
                    <TableCell>
                      <UserActionsMenu user={user} onChanged={() => { query.refetch(); setSuccessMessage(user.isActive ? 'User deactivated.' : 'User activated.'); }} onError={setActionError} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:hidden">
            {displayItems.map((user) => (
              <div key={user.id} className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface p-3 shadow-panel">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/users/${user.id}`} className="flex items-center gap-2.5">
                    <Avatar name={user.name} photoUrl={user.avatarUrl} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-ink">{user.name}</p>
                      <p className="text-xs text-ink-secondary">{user.email}</p>
                    </div>
                  </Link>
                  <UserStatusBadge isActive={user.isActive} />
                </div>
                <RoleBadgeList roles={user.roles} />
                <div className="flex items-center justify-between border-t border-line pt-2">
                  <span className="text-xs text-ink-muted">
                    {user.lastLoginAt ? `Last login: ${formatLastLogin(user.lastLoginAt)}` : 'Never logged in'}
                  </span>
                  <UserActionsMenu user={user} onChanged={() => { query.refetch(); setSuccessMessage(user.isActive ? 'User deactivated.' : 'User activated.'); }} onError={setActionError} />
                </div>
              </div>
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={filtered.length}
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
