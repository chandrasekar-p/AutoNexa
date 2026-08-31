'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { apiGet, apiPatch, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { resolveUploadUrl } from '@/lib/uploads';
import type { CurrentTenant } from '@/lib/api-types';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

/**
 * Workshop-wide (tenant) setting — every device signing into this workshop
 * sees the same wallpaper, via the public GET /tenants/branding/:slug
 * lookup on the login screen (see LoginBrandingProvider). Same
 * upload-then-PATCH pattern as WorkshopLogoSetting in
 * workshop-settings-card.tsx; independently fetches its own GET
 * /tenants/me, matching ReminderSettingsCard/NotificationChannelsCard's
 * same per-card-fetch precedent rather than sharing one query.
 */
export function LoginBackgroundSetting() {
  const canRead = usePermission('tenant:read');
  const canUpdate = usePermission('settings:update');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useApiQuery<CurrentTenant>(
    () => (canRead ? apiGet('/tenants/me') : Promise.reject(new Error('n/a'))),
    [canRead],
  );

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'login-background');
      const uploaded = await apiPost<{ url: string }>('/uploads', formData);
      await apiPatch('/tenants/me/settings', { loginBackgroundUrl: uploaded.url });
      query.refetch();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload this image.');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemove() {
    setError(null);
    try {
      await apiPatch('/tenants/me/settings', { loginBackgroundUrl: null });
      query.refetch();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove this image.');
    }
  }

  if (!canRead) return null;

  const backgroundUrl = query.data?.settings.loginBackgroundUrl ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        <div>
          <p className="text-sm text-ink">Login screen wallpaper</p>
          <p className="text-xs text-ink-muted">
            Shown behind the sign-in card for everyone signing into this workshop, on any device.
            JPEG, PNG, or WEBP.
          </p>
        </div>

        {query.isLoading ? <Skeleton className="h-32 w-full max-w-xs" /> : null}
        {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}

        {query.data && backgroundUrl ? (
          <div
            role="img"
            aria-label="Current login wallpaper"
            className="h-32 w-full max-w-xs rounded-lg border border-line bg-cover bg-center"
            style={{ backgroundImage: `url(${resolveUploadUrl(backgroundUrl)})` }}
          />
        ) : null}

        {error ? <p className="text-xs text-danger-600 dark:text-danger-400">{error}</p> : null}

        {query.data && canUpdate ? (
          <div className="flex gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()} isLoading={isUploading}>
              {backgroundUrl ? 'Change image' : 'Choose image'}
            </Button>
            {backgroundUrl ? (
              <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
                Remove
              </Button>
            ) : null}
          </div>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </CardBody>
    </Card>
  );
}
