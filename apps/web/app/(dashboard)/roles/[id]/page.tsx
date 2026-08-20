'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet, apiPatch, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import type { Permission, Role } from '@/lib/api-types';
import { PermissionGrid } from '@/components/domain/permission-grid';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

export default function RoleDetailPage() {
  const params = useParams<{ id: string }>();
  const canUpdate = usePermission('role:update');

  const query = useApiQuery<Role>(() => apiGet(`/roles/${params.id}`), [params.id]);
  const permissions = useApiQuery<Permission[]>(() => apiGet('/permissions'), []);

  const [name, setName] = useState<string | null>(null);
  const [permissionIds, setPermissionIds] = useState<string[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-ink">{role.name}</h1>
            <Badge tone={role.isSystem ? 'neutral' : 'accent'}>{role.isSystem ? 'System' : 'Custom'}</Badge>
          </div>
          {role.isSystem ? <p className="text-sm text-ink-secondary">System roles can&rsquo;t be modified.</p> : null}
        </div>
        <Link href="/roles" className="self-center text-sm text-ink-secondary hover:text-ink">
          &larr; Back to roles
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          {editable ? (
            <Input label="Name" value={name ?? role.name} onChange={(e) => setName(e.target.value)} className="max-w-sm" />
          ) : null}

          {permissions.isLoading ? <Skeleton className="h-64 w-full" /> : null}
          {permissions.error ? <ErrorState message={permissions.error} onRetry={permissions.refetch} /> : null}
          {permissions.data ? (
            <PermissionGrid
              permissions={permissions.data}
              selectedIds={currentPermissionIds}
              onChange={setPermissionIds}
              disabled={!editable}
            />
          ) : null}

          {saveError ? <p className="text-xs text-danger-600 dark:text-danger-400">{saveError}</p> : null}

          {editable && dirty ? (
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSave} isLoading={isSaving}>
                Save Changes
              </Button>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
