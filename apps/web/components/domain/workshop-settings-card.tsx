'use client';

import { useRef, useState } from 'react';
import { apiGet, apiPatch, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { resolveUploadUrl } from '@/lib/uploads';
import type { CurrentTenant, TenantSettings } from '@/lib/api-types';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

function WorkshopLogoSetting({
  logoUrl,
  canUpdate,
  onUpdated,
}: {
  logoUrl: string | null;
  canUpdate: boolean;
  onUpdated: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploaded = await apiPost<{ url: string }>('/uploads', formData);
      await apiPatch('/tenants/me/settings', { logoUrl: uploaded.url });
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload logo.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 border-b border-line pb-4">
      <span className="text-xs font-medium text-ink-secondary">Workshop Logo</span>
      <p className="text-xs text-ink-muted">Printed on this workshop&rsquo;s exported PDF reports.</p>
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <div
            className="h-14 w-14 rounded border border-line bg-surface-hover bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${resolveUploadUrl(logoUrl)})` }}
            role="img"
            aria-label="Current workshop logo"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded border border-dashed border-line text-micro text-ink-muted">
            No logo
          </div>
        )}
        {canUpdate ? (
          <div className="flex flex-col gap-1">
            <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()} isLoading={isUploading}>
              {logoUrl ? 'Change Logo' : 'Upload Logo'}
            </Button>
            {error ? <span className="text-xs text-danger-600 dark:text-danger-400">{error}</span> : null}
          </div>
        ) : null}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
    </div>
  );
}

/**
 * GET /tenants/me requires tenant:read, which only Workshop Owner gets by
 * default (see default-role-grants.ts) — gated on that permission entirely
 * so most roles simply don't see this card, rather than firing a request
 * that will always 403 for them.
 */
export function WorkshopSettingsCard() {
  const canRead = usePermission('tenant:read');
  const canUpdate = usePermission('settings:update');

  const query = useApiQuery<CurrentTenant>(
    () => (canRead ? apiGet('/tenants/me') : Promise.reject(new Error('n/a'))),
    [canRead],
  );

  const [values, setValues] = useState<Partial<Record<keyof TenantSettings, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function set(key: keyof TenantSettings, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSave() {
    if (!query.data) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await apiPatch('/tenants/me/settings', {
        jobCardPrefix: values.jobCardPrefix ?? query.data.settings.jobCardPrefix,
        invoicePrefix: values.invoicePrefix ?? query.data.settings.invoicePrefix,
        estimatePrefix: values.estimatePrefix ?? query.data.settings.estimatePrefix,
        poPrefix: values.poPrefix ?? query.data.settings.poPrefix,
        defaultGstRate: Number(values.defaultGstRate ?? query.data.settings.defaultGstRate),
        timezone: values.timezone ?? query.data.settings.timezone,
        state: values.state ?? query.data.settings.state ?? undefined,
        slackWebhookUrl: values.slackWebhookUrl ?? query.data.settings.slackWebhookUrl ?? undefined,
        businessHoursOpen: values.businessHoursOpen ?? query.data.settings.businessHoursOpen ?? undefined,
        businessHoursClose: values.businessHoursClose ?? query.data.settings.businessHoursClose ?? undefined,
      });
      setValues({});
      query.refetch();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!canRead) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workshop</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        {query.isLoading ? <Skeleton className="h-48 w-full" /> : null}
        {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}

        {query.data ? (
          <>
            <WorkshopLogoSetting logoUrl={query.data.settings.logoUrl} canUpdate={canUpdate} onUpdated={query.refetch} />

            <p className="text-xs text-ink-muted">
              The home state below determines CGST+SGST vs IGST on generated invoices — it must match your GSTIN
              registration state.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Job Card Prefix"
                value={values.jobCardPrefix ?? query.data.settings.jobCardPrefix}
                onChange={(e) => set('jobCardPrefix', e.target.value)}
                disabled={!canUpdate}
              />
              <Input
                label="Invoice Prefix"
                value={values.invoicePrefix ?? query.data.settings.invoicePrefix}
                onChange={(e) => set('invoicePrefix', e.target.value)}
                disabled={!canUpdate}
              />
              <Input
                label="Estimate Prefix"
                value={values.estimatePrefix ?? query.data.settings.estimatePrefix}
                onChange={(e) => set('estimatePrefix', e.target.value)}
                disabled={!canUpdate}
              />
              <Input
                label="Purchase Order Prefix"
                value={values.poPrefix ?? query.data.settings.poPrefix}
                onChange={(e) => set('poPrefix', e.target.value)}
                disabled={!canUpdate}
              />
              <Input
                label="Default GST Rate (%)"
                type="number"
                value={values.defaultGstRate ?? query.data.settings.defaultGstRate}
                onChange={(e) => set('defaultGstRate', e.target.value)}
                disabled={!canUpdate}
              />
              <Input
                label="Timezone"
                value={values.timezone ?? query.data.settings.timezone}
                onChange={(e) => set('timezone', e.target.value)}
                disabled={!canUpdate}
              />
              <Input
                label="Home State"
                value={values.state ?? query.data.settings.state ?? ''}
                onChange={(e) => set('state', e.target.value)}
                placeholder="Tamil Nadu"
                disabled={!canUpdate}
              />
              <Input
                label="Opens At"
                type="time"
                value={values.businessHoursOpen ?? query.data.settings.businessHoursOpen ?? ''}
                onChange={(e) => set('businessHoursOpen', e.target.value)}
                disabled={!canUpdate}
              />
              <Input
                label="Closes At"
                type="time"
                value={values.businessHoursClose ?? query.data.settings.businessHoursClose ?? ''}
                onChange={(e) => set('businessHoursClose', e.target.value)}
                disabled={!canUpdate}
              />
              <div className="flex flex-col gap-1.5">
                <Input
                  label="Slack Webhook URL"
                  value={values.slackWebhookUrl ?? query.data.settings.slackWebhookUrl ?? ''}
                  onChange={(e) => set('slackWebhookUrl', e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  disabled={!canUpdate}
                />
                <p className="text-xs text-ink-muted">Internal ops pings only (new appointment, invoice issued, ...) — never sent to customers.</p>
              </div>
            </div>

            {saveError ? <p className="text-xs text-danger-600 dark:text-danger-400">{saveError}</p> : null}

            {canUpdate && Object.keys(values).length > 0 ? (
              <div className="flex justify-end">
                <Button size="sm" onClick={handleSave} isLoading={isSaving}>
                  Save Changes
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </CardBody>
    </Card>
  );
}
