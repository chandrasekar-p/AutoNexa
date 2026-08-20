'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { apiGet, apiPatch, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useAuth } from '@/lib/auth';
import { validateUserProfileForm, type UserProfileFormErrors } from '@/lib/validation/user-profile';
import { validateChangePasswordForm, type ChangePasswordFormErrors } from '@/lib/validation/change-password';
import { formatDate } from '@/lib/format';
import type { UserProfile } from '@/lib/api-types';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

export default function ProfilePage() {
  const query = useApiQuery<UserProfile>(() => apiGet('/users/me'), []);

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">My Profile</h1>

      {query.isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}

      {query.data ? (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <ProfileCard profile={query.data} onSaved={query.refetch} />
          <ChangePasswordCard />
        </div>
      ) : null}
    </div>
  );
}

function ProfileCard({ profile, onSaved }: { profile: UserProfile; onSaved: () => void }) {
  const { setUserName } = useAuth();
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [errors, setErrors] = useState<UserProfileFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keep the form in sync if a refetch brings back a genuinely different
  // record (e.g. an admin edited this same user elsewhere) rather than
  // only ever reflecting this form's own local edits.
  useEffect(() => {
    setName(profile.name);
    setPhone(profile.phone ?? '');
  }, [profile.name, profile.phone]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const result = validateUserProfileForm({ name, phone });
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    try {
      const updated = await apiPatch<UserProfile>('/users/me', result.data);
      setUserName(updated.name);
      setSuccessMessage('Profile updated.');
      onSaved();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-5 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          {profile.roles.map(({ role }) => (
            <Badge key={role.id} tone="accent">
              {role.name}
            </Badge>
          ))}
          <span className="text-xs text-ink-muted">Member since {formatDate(profile.createdAt)}</span>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label="Email"
            value={profile.email}
            disabled
            title="Email can't be changed here — contact a workshop admin."
          />
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />

          {formError ? (
            <p
              role="alert"
              className="rounded border border-danger-100 bg-danger-50 px-3 py-2 text-xs text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400"
            >
              {formError}
            </p>
          ) : null}
          {successMessage ? (
            <p className="rounded border border-success-100 bg-success-50 px-3 py-2 text-xs text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
              {successMessage}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<ChangePasswordFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const result = validateChangePasswordForm({ currentPassword, newPassword, confirmPassword });
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    try {
      await apiPatch('/users/me/password', {
        currentPassword: result.data.currentPassword,
        newPassword: result.data.newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage('Password changed.');
    } catch (err) {
      // The backend's "Current password is incorrect" (400) is surfaced
      // verbatim, same discipline as the login page's error handling.
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
      </CardHeader>
      <CardBody className="pt-3">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label="Current Password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            error={errors.currentPassword}
          />
          <Input
            label="New Password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={errors.newPassword}
          />
          <Input
            label="Confirm New Password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
          />

          {formError ? (
            <p
              role="alert"
              className="rounded border border-danger-100 bg-danger-50 px-3 py-2 text-xs text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400"
            >
              {formError}
            </p>
          ) : null}
          {successMessage ? (
            <p className="rounded border border-success-100 bg-success-50 px-3 py-2 text-xs text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
              {successMessage}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" isLoading={isSubmitting}>
              Update Password
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
