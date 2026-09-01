'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, Plus, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { usePermission } from '@/lib/hooks/use-permission';
import { describeRole } from '@/lib/roles/role-stats';
import { exportRowsAsCsv } from '@/lib/export/csv';
import type { Role } from '@/lib/api-types';
import { RoleActionsMenu } from '@/components/domain/role-actions-menu';
import { DeleteRoleModal } from '@/components/domain/delete-role-modal';
import { KpiCard } from '@/components/domain/kpi-card';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardBody } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Toast } from '@/components/ui/toast';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const PAGE_SIZE = 10;
type TypeFilter = 'all' | 'system' | 'custom';
type SortKey = 'name' | 'permissions';

export default function RolesPage() {
  const router = useRouter();
  const canCreate = usePermission('role:create');
  const canReadUsers = usePermission('user:read');

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const query = useApiQuery<Role[]>(() => apiGet('/roles'), []);
  const users = useApiQuery<{ roles: { role: { id: string } }[] }[]>(
    () => (canReadUsers ? apiGet('/users') : Promise.reject(new Error('n/a'))),
    [canReadUsers],
  );

  const roles = query.data ?? [];
  const assignedCountByRoleId = useMemo(() => {
    const counts = new Map<string, number>();
    (users.data ?? []).forEach((u) => u.roles.forEach((r) => counts.set(r.role.id, (counts.get(r.role.id) ?? 0) + 1)));
    return counts;
  }, [users.data]);

  const kpis = useMemo(() => {
    const totalPermissions = roles.reduce((sum, r) => sum + r.permissions.length, 0);
    const mostPermissions = roles.reduce<Role | null>((best, r) => (!best || r.permissions.length > best.permissions.length ? r : best), null);
    return {
      total: roles.length,
      custom: roles.filter((r) => !r.isSystem).length,
      totalPermissions,
      mostPermissions,
    };
  }, [roles]);

  function resetPage() {
    setPage(1);
  }

  function handleKpiTypeClick(next: TypeFilter) {
    setTypeFilter((current) => (current === next ? 'all' : next));
    resetPage();
  }

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    let list = roles.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q)) return false;
      if (typeFilter === 'system' && !r.isSystem) return false;
      if (typeFilter === 'custom' && r.isSystem) return false;
      return true;
    });
    list = [...list].sort((a, b) =>
      sortKey === 'name' ? a.name.localeCompare(b.name) : b.permissions.length - a.permissions.length,
    );
    return list;
  }, [roles, debouncedSearch, typeFilter, sortKey]);

  const totalPages = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const displayItems = filtered.slice((page - 1) * pageSize, page * pageSize);
  const hasActiveFilters = Boolean(debouncedSearch || typeFilter !== 'all');

  function handleReset() {
    setSearch('');
    setTypeFilter('all');
    setSortKey('name');
    resetPage();
  }

  function handleExport() {
    if (filtered.length === 0) return;
    const columns = [
      { key: 'name', label: 'Role' },
      { key: 'type', label: 'Type' },
      { key: 'description', label: 'Description' },
      { key: 'permissions', label: 'Permissions' },
      { key: 'status', label: 'Status' },
    ];
    const rows = filtered.map((r) => ({
      name: r.name,
      type: r.isSystem ? 'System' : 'Custom',
      description: describeRole(r),
      permissions: r.permissions.length,
      status: 'Active',
    }));
    exportRowsAsCsv(columns, rows, `roles-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Roles</h1>
          <p className="text-sm text-ink-secondary">Configure role-based permissions for staff in this workshop.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Export
          </Button>
          {canCreate ? (
            <Button type="button" size="sm" onClick={() => router.push('/roles/new')}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              New Role
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
          <button type="button" onClick={() => handleKpiTypeClick('all')} className="text-left">
            <KpiCard label="Total Roles" value={kpis.total} sublabel="All roles" tone="neutral" icon={<Shield className="h-4 w-4" />} />
          </button>
          <button type="button" onClick={() => handleKpiTypeClick('custom')} className="text-left">
            <KpiCard label="Custom Roles" value={kpis.custom} sublabel="Custom created" tone="teal" icon={<Shield className="h-4 w-4" />} />
          </button>
          <KpiCard label="Total Permissions" value={kpis.totalPermissions} sublabel="Across all roles" tone="blue" icon={<Shield className="h-4 w-4" />} />
          <KpiCard
            label="Most Permissions"
            value={kpis.mostPermissions?.name ?? '—'}
            sublabel={kpis.mostPermissions ? `${kpis.mostPermissions.permissions.length} permissions` : undefined}
            tone="fuchsia"
            icon={<Shield className="h-4 w-4" />}
          />
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
                placeholder="Search roles..."
                aria-label="Search roles"
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
              <div className="w-40">
                <Select
                  label="Type"
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value as TypeFilter);
                    resetPage();
                  }}
                >
                  <option value="all">All Types</option>
                  <option value="custom">Custom</option>
                  <option value="system">System</option>
                </Select>
              </div>
              <div className="w-40">
                <Select label="Status" value="all" disabled title="Every role is currently active — there is no inactive state">
                  <option value="all">All Statuses</option>
                </Select>
              </div>
              <div className="w-44">
                <Select label="Sort by" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
                  <option value="name">Name</option>
                  <option value="permissions">Permission count</option>
                </Select>
              </div>
            </div>
          ) : null}
        </CardBody>
      </Card>

      {query.data && displayItems.length === 0 && !hasActiveFilters ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-5 py-14 text-center">
          <Shield className="h-8 w-8 text-ink-muted" aria-hidden />
          <div>
            <p className="text-sm font-medium text-ink">No roles yet</p>
            <p className="text-xs text-ink-muted">Create a role to get started.</p>
          </div>
        </div>
      ) : null}

      {query.data && displayItems.length === 0 && hasActiveFilters ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-5 py-14 text-center">
          <Shield className="h-8 w-8 text-ink-muted" aria-hidden />
          <div>
            <p className="text-sm font-medium text-ink">No roles found</p>
            <p className="text-xs text-ink-muted">Try changing your search or filters.</p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={handleReset}>
            Clear Filters
          </Button>
        </div>
      ) : null}

      {query.data && displayItems.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface shadow-card sm:block">
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Role</TableHeaderCell>
                  <TableHeaderCell>Type</TableHeaderCell>
                  <TableHeaderCell>Description</TableHeaderCell>
                  <TableHeaderCell>Permissions</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {displayItems.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">
                      <Link href={`/roles/${role.id}`} className="flex items-center gap-2.5 hover:text-accent-600">
                        <Avatar name={role.name} size="sm" />
                        <span className="text-ink">{role.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge tone={role.isSystem ? 'neutral' : 'warning'}>{role.isSystem ? 'System' : 'Custom'}</Badge>
                    </TableCell>
                    <TableCell className="text-ink-secondary">{describeRole(role)}</TableCell>
                    <TableCell className="num text-ink-secondary">{role.permissions.length}</TableCell>
                    <TableCell>
                      <Badge tone="success">Active</Badge>
                    </TableCell>
                    <TableCell>
                      <RoleActionsMenu role={role} onDeleteRequested={() => setDeleteTarget(role)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:hidden">
            {displayItems.map((role) => (
              <div key={role.id} className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface p-3 shadow-panel">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/roles/${role.id}`} className="flex items-center gap-2.5">
                    <Avatar name={role.name} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-ink">{role.name}</p>
                      <p className="text-xs text-ink-secondary">{describeRole(role)}</p>
                    </div>
                  </Link>
                  <Badge tone="success">Active</Badge>
                </div>
                <div className="flex items-center justify-between border-t border-line pt-2">
                  <span className="text-xs text-ink-muted">
                    <Badge tone={role.isSystem ? 'neutral' : 'warning'}>{role.isSystem ? 'System' : 'Custom'}</Badge>{' '}
                    {role.permissions.length} permissions
                  </span>
                  <RoleActionsMenu role={role} onDeleteRequested={() => setDeleteTarget(role)} />
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

      {deleteTarget ? (
        <DeleteRoleModal
          role={deleteTarget}
          assignedUserCount={assignedCountByRoleId.get(deleteTarget.id) ?? 0}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            setSuccessMessage('Role deleted.');
            query.refetch();
          }}
        />
      ) : null}
    </div>
  );
}
