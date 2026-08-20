'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { AppUser, Role } from '@/lib/api-types';
import { Card, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

export default function NewUserPage() {
  const router = useRouter();
  const roles = useApiQuery<Role[]>(() => apiGet('/roles'), []);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleRole(id: string) {
    setRoleIds((ids) => (ids.includes(id) ? ids.filter((r) => r !== id) : [...ids, id]));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !email.trim() || password.length < 8) {
      setFormError('Name, email, and an 8+ character password are required.');
      return;
    }
    if (roleIds.length === 0) {
      setFormError('Select at least one role.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      const user = await apiPost<AppUser>('/users', { name, email, password, phone: phone || undefined, roleIds });
      router.push(`/users/${user.id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">New User</h1>
        <p className="text-sm text-ink-secondary">Create a new workshop staff account.</p>
      </div>

      {roles.isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {roles.error ? <ErrorState message={roles.error} onRetry={roles.refetch} /> : null}

      {roles.data ? (
        <Card>
          <CardBody className="pt-5">
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
                <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-ink-secondary">Roles</span>
                <div className="flex flex-wrap gap-3">
                  {roles.data.map((role) => (
                    <label key={role.id} className="flex items-center gap-2 rounded border border-line px-3 py-1.5 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={roleIds.includes(role.id)}
                        onChange={() => toggleRole(role.id)}
                        className="h-4 w-4 rounded border-line"
                      />
                      {role.name}
                    </label>
                  ))}
                </div>
              </div>

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
                  Create User
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
