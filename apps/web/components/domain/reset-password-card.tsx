'use client';

import { useState, type FormEvent } from 'react';
import { apiPatch, ApiError } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ResetPasswordCardProps {
  userId: string;
  userName: string;
}

/** Admin-triggered reset (PATCH /users/:id/password, user:update) — no current-password check, unlike the self-service change-password flow on the Profile page. The admin sets it directly and tells the employee out of band; there's no email/SMS delivery channel in this app yet to send a reset link instead. */
export function ResetPasswordCard({ userId, userName }: ResetPasswordCardProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiPatch(`/users/${userId}/password`, { newPassword });
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage(`Password reset for ${userName}. Let them know their new password directly.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <p className="text-xs text-ink-muted">
            Sets this account&rsquo;s password directly — no current password required, since this is an admin action,
            not a self-service change.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="New Password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              label="Confirm New Password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded border border-danger-100 bg-danger-50 px-3 py-2 text-xs text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400"
            >
              {error}
            </p>
          ) : null}
          {successMessage ? (
            <p className="rounded border border-success-100 bg-success-50 px-3 py-2 text-xs text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
              {successMessage}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Reset Password
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
