'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { PermissionMatrix } from '@/components/domain/permission-matrix';
import type { Permission, Role } from '@/lib/api-types';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

export default function NewRolePage() {
  const router = useRouter();
  const permissions = useApiQuery<Permission[]>(() => apiGet('/permissions'), []);

  const [name, setName] = useState('');
  const [permissionIds, setPermissionIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setFormError('Role name is required.');
      return;
    }
    if (permissionIds.length === 0) {
      setFormError('Select at least one permission.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      const role = await apiPost<Role>('/roles', { name, permissionIds });
      router.push(`/roles/${role.id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div>
        <Link href="/roles" className="text-sm text-ink-secondary hover:text-ink">
          &larr; Back to Roles
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink">New Role</h1>
        <p className="text-sm text-ink-secondary">Define a custom role and the permissions it grants.</p>
      </div>

      {permissions.isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {permissions.error ? <ErrorState message={permissions.error} onRetry={permissions.refetch} /> : null}

      {permissions.data ? (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Role Information</CardTitle>
              </CardHeader>
              <CardBody className="flex flex-col gap-4 pt-3">
                <Input label="Role Name *" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Service Advisor, Accountant" required />
                <p className="text-xs text-ink-muted">
                  There&rsquo;s no description field to set here — roles don&rsquo;t have one in this app yet. The
                  permissions you grant below are what defines this role.
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Permissions</CardTitle>
              </CardHeader>
              <CardBody className="pt-3">
                <PermissionMatrix permissions={permissions.data} selectedIds={permissionIds} onChange={setPermissionIds} />
              </CardBody>
            </Card>
          </div>

          {formError ? (
            <p
              role="alert"
              className="rounded border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400"
            >
              {formError}
            </p>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => router.back()} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create Role
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
