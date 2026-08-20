'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { Permission, Role } from '@/lib/api-types';
import { PermissionGrid } from '@/components/domain/permission-grid';
import { Card, CardBody } from '@/components/ui/card';
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
      setFormError('Name is required.');
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
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">New Role</h1>
        <p className="text-sm text-ink-secondary">Define a custom role and the permissions it grants.</p>
      </div>

      {permissions.isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {permissions.error ? <ErrorState message={permissions.error} onRetry={permissions.refetch} /> : null}

      {permissions.data ? (
        <Card>
          <CardBody className="flex flex-col gap-5 pt-5">
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} className="max-w-sm" required />
              <PermissionGrid permissions={permissions.data} selectedIds={permissionIds} onChange={setPermissionIds} />

              {formError ? (
                <p
                  role="alert"
                  className="rounded border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400"
                >
                  {formError}
                </p>
              ) : null}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => router.back()} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  Create Role
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
