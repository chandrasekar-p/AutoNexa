'use client';

import { useState } from 'react';
import { apiGet, apiPatch, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import type { CurrentTenant } from '@/lib/api-types';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

interface FormState {
  reminderInsuranceEnabled: boolean;
  reminderPucEnabled: boolean;
  reminderServiceDueEnabled: boolean;
  reminderThresholdDays: string; // comma-separated in the input, parsed to number[] on save
  serviceIntervalMonths: string;
  serviceIntervalKm: string;
}

function toFormState(settings: CurrentTenant['settings']): FormState {
  return {
    reminderInsuranceEnabled: settings.reminderInsuranceEnabled,
    reminderPucEnabled: settings.reminderPucEnabled,
    reminderServiceDueEnabled: settings.reminderServiceDueEnabled,
    reminderThresholdDays: settings.reminderThresholdDays.join(', '),
    serviceIntervalMonths: String(settings.serviceIntervalMonths),
    serviceIntervalKm: String(settings.serviceIntervalKm),
  };
}

/**
 * Controls for the customer-facing reminder cron (reminder-cron.service.ts)
 * — a separate card from WorkshopSettingsCard since its fields are a mix of
 * booleans/arrays/numbers rather than that card's plain-string map, and the
 * two are independent concerns with their own Save action.
 */
export function ReminderSettingsCard() {
  const canRead = usePermission('tenant:read');
  const canUpdate = usePermission('settings:update');

  const query = useApiQuery<CurrentTenant>(() => (canRead ? apiGet('/tenants/me') : Promise.reject(new Error('n/a'))), [canRead]);

  const [form, setForm] = useState<FormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const values = form ?? (query.data ? toFormState(query.data.settings) : null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...(prev ?? (query.data ? toFormState(query.data.settings) : ({} as FormState))), [key]: value }));
  }

  async function handleSave() {
    if (!values) return;
    const thresholdDays = values.reminderThresholdDays
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);

    setIsSaving(true);
    setSaveError(null);
    try {
      await apiPatch('/tenants/me/settings', {
        reminderInsuranceEnabled: values.reminderInsuranceEnabled,
        reminderPucEnabled: values.reminderPucEnabled,
        reminderServiceDueEnabled: values.reminderServiceDueEnabled,
        reminderThresholdDays: thresholdDays,
        serviceIntervalMonths: Number(values.serviceIntervalMonths),
        serviceIntervalKm: Number(values.serviceIntervalKm),
      });
      setForm(null);
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
        <CardTitle>Customer Reminders</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        {query.isLoading ? <Skeleton className="h-48 w-full" /> : null}
        {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}

        {values ? (
          <>
            <p className="text-xs text-ink-muted">
              Proactive reminders sent to customers by Email/SMS/WhatsApp — insurance and PUC expiry, and next-service-due. A
              customer can opt out individually from their own record.
            </p>

            <div className="flex flex-col gap-2.5">
              <label className="flex items-center gap-2.5 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={values.reminderInsuranceEnabled}
                  onChange={(e) => set('reminderInsuranceEnabled', e.target.checked)}
                  disabled={!canUpdate}
                  className="h-4 w-4 rounded border-line accent-accent-500"
                />
                Insurance expiry reminders
              </label>
              <label className="flex items-center gap-2.5 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={values.reminderPucEnabled}
                  onChange={(e) => set('reminderPucEnabled', e.target.checked)}
                  disabled={!canUpdate}
                  className="h-4 w-4 rounded border-line accent-accent-500"
                />
                PUC certificate expiry reminders
              </label>
              <label className="flex items-center gap-2.5 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={values.reminderServiceDueEnabled}
                  onChange={(e) => set('reminderServiceDueEnabled', e.target.checked)}
                  disabled={!canUpdate}
                  className="h-4 w-4 rounded border-line accent-accent-500"
                />
                Next-service-due reminders
              </label>
            </div>

            <div className="flex flex-col gap-1.5">
              <Input
                label="Reminder thresholds (days before due)"
                value={values.reminderThresholdDays}
                onChange={(e) => set('reminderThresholdDays', e.target.value)}
                placeholder="30, 15, 7"
                disabled={!canUpdate}
              />
              <p className="text-xs text-ink-muted">Comma-separated. Applies to insurance, PUC, and date-based service-due reminders alike.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Default service interval (months)"
                type="number"
                value={values.serviceIntervalMonths}
                onChange={(e) => set('serviceIntervalMonths', e.target.value)}
                disabled={!canUpdate}
              />
              <Input
                label="Default service interval (km)"
                type="number"
                value={values.serviceIntervalKm}
                onChange={(e) => set('serviceIntervalKm', e.target.value)}
                disabled={!canUpdate}
              />
            </div>
            <p className="text-xs text-ink-muted">A vehicle&rsquo;s own service interval override, if set, takes priority over these defaults.</p>

            {saveError ? <p className="text-xs text-danger-600 dark:text-danger-400">{saveError}</p> : null}

            {canUpdate && form ? (
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
