'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet, apiPatch, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { formatDate } from '@/lib/format';
import type { AppUser, Role } from '@/lib/api-types';
import { ResetPasswordCard } from '@/components/domain/reset-password-card';
import { UserAvatarUpload } from '@/components/domain/user-avatar-upload';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const canUpdate = usePermission('user:update');

  const query = useApiQuery<AppUser>(() => apiGet(`/users/${params.id}`), [params.id]);
  const roles = useApiQuery<Role[]>(() => apiGet('/roles'), []);

  const [name, setName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [roleIds, setRoleIds] = useState<string[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function toggleRole(id: string) {
    if (!query.data) return;
    const current = roleIds ?? query.data.roles.map((r) => r.role.id);
    setRoleIds(current.includes(id) ? current.filter((r) => r !== id) : [...current, id]);
  }

  async function handleSave() {
    if (!query.data) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await apiPatch(`/users/${params.id}`, {
        name: name ?? query.data.name,
        phone: (phone ?? query.data.phone ?? '') || undefined,
        isActive: isActive ?? query.data.isActive,
        roleIds: roleIds ?? query.data.roles.map((r) => r.role.id),
      });
      setName(null);
      setPhone(null);
      setIsActive(null);
      setRoleIds(null);
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

  const user = query.data;
  if (!user) return null;

  const currentRoleIds = roleIds ?? user.roles.map((r) => r.role.id);
  const dirty = name !== null || phone !== null || isActive !== null || roleIds !== null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <UserAvatarUpload
            userId={user.id}
            name={user.name}
            avatarUrl={user.avatarUrl}
            canUpdate={canUpdate}
            onUploaded={async (avatarUrl) => {
              await apiPatch(`/users/${params.id}`, { avatarUrl });
              query.refetch();
            }}
          />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-ink">{user.name}</h1>
              <Badge tone={user.isActive ? 'success' : 'neutral'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
            </div>
            <p className="text-sm text-ink-secondary">{user.email}</p>
          </div>
        </div>
        <Link href="/users" className="self-center text-sm text-ink-secondary hover:text-ink">
          &larr; Back to users
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Email" value={user.email} disabled title="Email can't be changed here." />
            <Input label="Member Since" value={formatDate(user.createdAt)} disabled />
            {canUpdate ? (
              <Input label="Name" value={name ?? user.name} onChange={(e) => setName(e.target.value)} />
            ) : (
              <Field label="Name" value={user.name} />
            )}
            {canUpdate ? (
              <Input label="Phone" value={phone ?? user.phone ?? ''} onChange={(e) => setPhone(e.target.value)} />
            ) : (
              <Field label="Phone" value={user.phone ?? '—'} />
            )}
          </div>

          {canUpdate ? (
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={isActive ?? user.isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-line"
              />
              Active
            </label>
          ) : null}

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-ink-secondary">Roles</span>
            {roles.data ? (
              <div className="flex flex-wrap gap-3">
                {roles.data.map((role) =>
                  canUpdate ? (
                    <label key={role.id} className="flex items-center gap-2 rounded border border-line px-3 py-1.5 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={currentRoleIds.includes(role.id)}
                        onChange={() => toggleRole(role.id)}
                        className="h-4 w-4 rounded border-line"
                      />
                      {role.name}
                    </label>
                  ) : currentRoleIds.includes(role.id) ? (
                    <Badge key={role.id} tone="accent">
                      {role.name}
                    </Badge>
                  ) : null,
                )}
              </div>
            ) : null}
          </div>

          {saveError ? <p className="text-xs text-danger-600 dark:text-danger-400">{saveError}</p> : null}

          {canUpdate && dirty ? (
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSave} isLoading={isSaving}>
                Save Changes
              </Button>
            </div>
          ) : null}
        </CardBody>
      </Card>

      {canUpdate ? <ResetPasswordCard userId={user.id} userName={user.name} /> : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-micro font-semibold uppercase tracking-wide text-ink-secondary">{label}</span>
      <span className="text-sm text-ink">{value}</span>
    </div>
  );
}
