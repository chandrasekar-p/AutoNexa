'use client';

import { useState } from 'react';
import { apiGet, apiPatch, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import type { CurrentTenant, TenantSettings } from '@/lib/api-types';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

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
