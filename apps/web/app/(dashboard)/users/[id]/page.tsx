'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Check } from 'lucide-react';
import { apiGet, apiPatch, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { useAuth } from '@/lib/auth/auth-context';
import { formatDate } from '@/lib/format';
import type { AppUser, Role } from '@/lib/api-types';
import { ResetPasswordCard } from '@/components/domain/reset-password-card';
import { UserAvatarUpload } from '@/components/domain/user-avatar-upload';
import { UserStatusBadge } from '@/components/domain/user-status-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Toast } from '@/components/ui/toast';

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const canUpdate = usePermission('user:update');
  const { user: currentUser } = useAuth();

  const query = useApiQuery<AppUser>(() => apiGet(`/users/${params.id}`), [params.id]);
  const roles = useApiQuery<Role[]>(() => apiGet('/roles'), []);

  const [name, setName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [roleIds, setRoleIds] = useState<string[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    searchParams.get('created') ? 'User created successfully.' : null,
  );

  useEffect(() => {
    if (window.location.hash === '#roles') {
      document.getElementById('roles')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [query.data]);

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
        roleIds: roleIds ?? query.data.roles.map((r) => r.role.id),
      });
      setName(null);
      setPhone(null);
      setRoleIds(null);
      setSuccessMessage('Changes saved successfully.');
      query.refetch();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleStatus(user: AppUser) {
    if (user.isActive && !window.confirm(`Deactivate User?\n\nAre you sure you want to deactivate ${user.name}? They will no longer be able to access AutoNexa.`)) {
      return;
    }
    setIsTogglingStatus(true);
    setStatusError(null);
    try {
      await apiPatch(`/users/${params.id}`, { isActive: !user.isActive });
      setSuccessMessage(user.isActive ? 'User deactivated.' : 'User activated.');
      query.refetch();
    } catch (err) {
      setStatusError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsTogglingStatus(false);
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
  const dirty = name !== null || phone !== null || roleIds !== null;
  const isSelf = user.id === currentUser?.userId;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
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
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-ink">{user.name}</h1>
              <UserStatusBadge isActive={user.isActive} />
              {user.roles.map((r) => (
                <Badge key={r.role.id} tone="accent">
                  {r.role.name}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-ink-secondary">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {canUpdate && !isSelf ? (
            <Button
              size="sm"
              variant={user.isActive ? 'danger' : 'secondary'}
              onClick={() => handleToggleStatus(user)}
              isLoading={isTogglingStatus}
            >
              {user.isActive ? 'Deactivate User' : 'Activate User'}
            </Button>
          ) : null}
          <Link href="/users" className="self-center text-sm text-ink-secondary hover:text-ink">
            &larr; Back to users
          </Link>
        </div>
      </div>

      {statusError ? <p className="text-xs text-danger-600 dark:text-danger-400">{statusError}</p> : null}
      {successMessage ? <Toast message={successMessage} onDismiss={() => setSuccessMessage(null)} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
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
        </CardBody>
      </Card>

      <Card id="roles">
        <CardHeader>
          <CardTitle>Roles & Access</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-3 pt-3">
          {roles.isLoading ? <Skeleton className="h-20 w-full" /> : null}
          {roles.error ? <ErrorState message={roles.error} onRetry={roles.refetch} /> : null}
          {roles.data ? (
            canUpdate ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {roles.data.map((role) => {
                  const checked = currentRoleIds.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleRole(role.id)}
                      aria-pressed={checked}
                      className={
                        checked
                          ? 'flex items-center justify-between gap-2 rounded-lg border border-accent-400 bg-accent-50 px-4 py-3 text-left transition-colors dark:bg-accent-500/10'
                          : 'flex items-center justify-between gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-hover'
                      }
                    >
                      <span className="text-sm font-medium text-ink">{role.name}</span>
                      {checked ? (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-500 text-white">
                          <Check className="h-3 w-3" aria-hidden />
                        </span>
                      ) : (
                        <span className="h-5 w-5 shrink-0 rounded-full border border-line" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {user.roles.length > 0 ? (
                  user.roles.map((r) => (
                    <Badge key={r.role.id} tone="accent">
                      {r.role.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-ink-muted">No roles assigned.</span>
                )}
              </div>
            )
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
        </CardHeader>
        <CardBody className="flex items-center justify-between gap-3 pt-3">
          <div>
            <p className="text-sm text-ink">This account is currently <span className="font-medium">{user.isActive ? 'active' : 'inactive'}</span>.</p>
            <p className="text-xs text-ink-muted">
              {user.isActive ? 'Deactivating signs the user out immediately and blocks further sign-in.' : 'Activating restores sign-in access for this user.'}
            </p>
          </div>
          {canUpdate && !isSelf ? (
            <Button
              size="sm"
              variant={user.isActive ? 'danger' : 'secondary'}
              onClick={() => handleToggleStatus(user)}
              isLoading={isTogglingStatus}
            >
              {user.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          ) : null}
        </CardBody>
      </Card>

      {saveError ? <p className="text-xs text-danger-600 dark:text-danger-400">{saveError}</p> : null}

      {canUpdate && dirty ? (
        <div className="flex justify-end gap-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setName(null);
              setPhone(null);
              setRoleIds(null);
              setSaveError(null);
            }}
            disabled={isSaving}
          >
            Discard
          </Button>
          <Button size="sm" onClick={handleSave} isLoading={isSaving}>
            Save Changes
          </Button>
        </div>
      ) : null}

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
