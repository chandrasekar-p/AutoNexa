'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Pencil, Shield, Grid3x3, Eye, PenLine, Trash2, MoreVertical } from 'lucide-react';
import { apiGet, apiPatch, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { computeRoleStats, describeRole } from '@/lib/roles/role-stats';
import type { Permission, Role, UserProfile } from '@/lib/api-types';
import { PermissionMatrix } from '@/components/domain/permission-matrix';
import { DeleteRoleModal } from '@/components/domain/delete-role-modal';
import { UserStatusBadge } from '@/components/domain/user-status-badge';
import { KpiCard } from '@/components/domain/kpi-card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Toast } from '@/components/ui/toast';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

type TabKey = 'permissions' | 'users';

export default function RoleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const canUpdate = usePermission('role:update');
  const canDelete = usePermission('role:delete');
  const canReadUsers = usePermission('user:read');

  const query = useApiQuery<Role>(() => apiGet(`/roles/${params.id}`), [params.id]);
  const permissions = useApiQuery<Permission[]>(() => apiGet('/permissions'), []);
  const users = useApiQuery<UserProfile[]>(
    () => (canReadUsers ? apiGet('/users') : Promise.reject(new Error('n/a'))),
    [canReadUsers],
  );

  const [tab, setTab] = useState<TabKey>('permissions');
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [permissionIds, setPermissionIds] = useState<string[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  async function handleSave() {
    if (!query.data) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await apiPatch(`/roles/${params.id}`, {
        name: name ?? query.data.name,
        permissionIds: permissionIds ?? query.data.permissions.map((p) => p.permission.id),
      });
      setName(null);
      setPermissionIds(null);
      setIsEditing(false);
      setSuccessMessage('Role updated successfully.');
      query.refetch();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.error) {
    return <ErrorState message={query.error} onRetry={query.refetch} />;
  }

  const role = query.data;
  if (!role) return null;

  const editable = canUpdate && !role.isSystem;
  const currentPermissionIds = permissionIds ?? role.permissions.map((p) => p.permission.id);
  const dirty = name !== null || permissionIds !== null;
  const stats = computeRoleStats(role);
  const assignedUsers = (users.data ?? []).filter((u) => u.roles.some((r) => r.role.id === role.id));

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={role.name} size="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-ink">{isEditing && editable ? (name ?? role.name) : role.name}</h1>
              <Badge tone={role.isSystem ? 'neutral' : 'warning'}>{role.isSystem ? 'System' : 'Custom'}</Badge>
              <Badge tone="success">Active</Badge>
            </div>
            <p className="text-sm text-ink-secondary">{describeRole(role)}</p>
            {role.isSystem ? <p className="text-xs text-ink-muted">System roles can&rsquo;t be modified.</p> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editable ? (
            <Button size="sm" variant={isEditing ? 'secondary' : 'primary'} onClick={() => setIsEditing((v) => !v)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              {isEditing ? 'Cancel Edit' : 'Edit Role'}
            </Button>
          ) : null}
          {canDelete && !role.isSystem ? (
            <div className="relative">
              <Button size="sm" variant="secondary" onClick={() => setShowMoreMenu((v) => !v)}>
                <MoreVertical className="h-3.5 w-3.5" aria-hidden />
              </Button>
              {showMoreMenu ? (
                <div className="absolute right-0 top-full z-30 mt-1 w-40 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-card">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowDeleteModal(true);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Delete Role
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          <Link href="/roles" className="self-center text-sm text-ink-secondary hover:text-ink">
            &larr; Back to Roles
          </Link>
        </div>
      </div>

      {successMessage ? <Toast message={successMessage} onDismiss={() => setSuccessMessage(null)} /> : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total Permissions" value={stats.total} tone="neutral" icon={<Shield className="h-4 w-4" />} />
        <KpiCard label="Modules Access" value={stats.modules} tone="blue" icon={<Grid3x3 className="h-4 w-4" />} />
        <KpiCard label="Read Permissions" value={stats.read} tone="teal" icon={<Eye className="h-4 w-4" />} />
        <KpiCard label="Write Permissions" value={stats.write} tone="fuchsia" icon={<PenLine className="h-4 w-4" />} />
      </div>

      <div className="flex gap-2 border-b border-line">
        <button
          type="button"
          onClick={() => setTab('permissions')}
          className={
            tab === 'permissions'
              ? 'border-b-2 border-accent-500 px-3 py-2 text-sm font-medium text-accent-600 dark:text-accent-400'
              : 'border-b-2 border-transparent px-3 py-2 text-sm font-medium text-ink-secondary hover:text-ink'
          }
        >
          Permissions ({stats.total})
        </button>
        {canReadUsers ? (
          <button
            type="button"
            onClick={() => setTab('users')}
            className={
              tab === 'users'
                ? 'border-b-2 border-accent-500 px-3 py-2 text-sm font-medium text-accent-600 dark:text-accent-400'
                : 'border-b-2 border-transparent px-3 py-2 text-sm font-medium text-ink-secondary hover:text-ink'
            }
          >
            Users ({assignedUsers.length})
          </button>
        ) : null}
      </div>

      {tab === 'permissions' ? (
        <Card>
          <CardBody className="flex flex-col gap-4 pt-5">
            {isEditing && editable ? (
              <Input label="Role Name" value={name ?? role.name} onChange={(e) => setName(e.target.value)} className="max-w-sm" />
            ) : null}

            {permissions.isLoading ? <Skeleton className="h-64 w-full" /> : null}
            {permissions.error ? <ErrorState message={permissions.error} onRetry={permissions.refetch} /> : null}
            {permissions.data ? (
              <PermissionMatrix
                permissions={permissions.data}
                selectedIds={currentPermissionIds}
                onChange={isEditing && editable ? setPermissionIds : undefined}
                readOnly={!(isEditing && editable)}
              />
            ) : null}

            {saveError ? <p className="text-xs text-danger-600 dark:text-danger-400">{saveError}</p> : null}

            {isEditing && editable && dirty ? (
              <div className="flex justify-end">
                <Button size="sm" onClick={handleSave} isLoading={isSaving}>
                  Save Changes
                </Button>
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="pt-5">
            {users.isLoading ? <Skeleton className="h-40 w-full" /> : null}
            {users.error ? <ErrorState message={users.error} onRetry={users.refetch} /> : null}
            {users.data ? (
              assignedUsers.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-muted">No users are assigned to this role.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHead>
                      <tr>
                        <TableHeaderCell>Name</TableHeaderCell>
                        <TableHeaderCell>Email</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell>Actions</TableHeaderCell>
                      </tr>
                    </TableHead>
                    <TableBody>
                      {assignedUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={u.name} photoUrl={u.avatarUrl} size="sm" />
                              <span className="text-ink">{u.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-ink-secondary">{u.email}</TableCell>
                          <TableCell>
                            <UserStatusBadge isActive={u.isActive} />
                          </TableCell>
                          <TableCell>
                            <Link href={`/users/${u.id}`} className="text-xs font-medium text-accent-600 hover:underline dark:text-accent-400">
                              View User
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            ) : null}
          </CardBody>
        </Card>
      )}

      {showDeleteModal ? (
        <DeleteRoleModal
          role={role}
          assignedUserCount={assignedUsers.length}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => {
            router.push('/roles');
          }}
        />
      ) : null}
    </div>
  );
}
