'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { validateCreateUserForm, type CreateUserFormErrors } from '@/lib/validation/user';
import type { AppUser, Role } from '@/lib/api-types';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
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
  const [errors, setErrors] = useState<CreateUserFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleRole(id: string) {
    setRoleIds((ids) => (ids.includes(id) ? ids.filter((r) => r !== id) : [...ids, id]));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = validateCreateUserForm({ name, email, password, phone, roleIds });
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      const user = await apiPost<AppUser>('/users', result.data);
      router.push(`/users/${user.id}?created=1`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/users" className="text-sm text-ink-secondary hover:text-ink">
          &larr; Back to Users
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink">New User</h1>
        <p className="text-sm text-ink-secondary">Create a new workshop staff account and assign their roles.</p>
      </div>

      {roles.isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {roles.error ? <ErrorState message={roles.error} onRetry={roles.refetch} /> : null}

      {roles.data ? (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardBody className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2">
              <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required />
              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />
              <div className="flex flex-col gap-1.5">
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  required
                />
                {!errors.password ? <p className="text-xs text-ink-muted">At least 8 characters.</p> : null}
              </div>
              <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Roles & Access</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-3 pt-3">
              <p className="text-xs text-ink-muted">Select one or more roles. Permissions for each role are managed under Roles & Permissions.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {roles.data.map((role) => {
                  const checked = roleIds.includes(role.id);
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
              {errors.roleIds ? <p className="text-xs text-danger-600 dark:text-danger-400">{errors.roleIds}</p> : null}
            </CardBody>
          </Card>

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
              Create User
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
