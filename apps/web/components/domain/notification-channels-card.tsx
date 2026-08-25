'use client';

import { useState } from 'react';
import { apiGet, apiPatch, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import type { CurrentTenant } from '@/lib/api-types';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

interface FormState {
  notifyByEmail: boolean;
  notifyBySms: boolean;
  notifyByWhatsapp: boolean;
}

function toFormState(settings: CurrentTenant['settings']): FormState {
  return {
    notifyByEmail: settings.notifyByEmail,
    notifyBySms: settings.notifyBySms,
    notifyByWhatsapp: settings.notifyByWhatsapp,
  };
}

/**
 * Which channel(s) this workshop wants customer-facing notifications sent
 * through (see apps/api's pick-channels.ts) — a separate concern from
 * ReminderSettingsCard's on/off-per-reminder-type toggles: this governs
 * every customer notification (estimate ready, invoice issued, payment
 * received, loyalty adjustment, reminders, ...), not just the reminder
 * cron. A channel only actually fires when it's both enabled here AND the
 * underlying provider (SMTP/Twilio/WhatsApp Cloud API) is configured — a
 * channel enabled here with no provider configured just does nothing,
 * same as today.
 */
export function NotificationChannelsCard() {
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
    setIsSaving(true);
    setSaveError(null);
    try {
      await apiPatch('/tenants/me/settings', values);
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
        <CardTitle>Notification Channels</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        {query.isLoading ? <Skeleton className="h-32 w-full" /> : null}
        {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}

        {values ? (
          <>
            <p className="text-xs text-ink-muted">
              Which channel(s) to use for customer-facing messages — estimate ready, invoice issued, payment received, reminders,
              and more. A channel still needs its provider configured (SMTP / Twilio / WhatsApp Cloud API) to actually send;
              turning it off here simply means it&rsquo;s never used even if configured.
            </p>

            <div className="flex flex-col gap-2.5">
              <label className="flex items-center gap-2.5 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={values.notifyByEmail}
                  onChange={(e) => set('notifyByEmail', e.target.checked)}
                  disabled={!canUpdate}
                  className="h-4 w-4 rounded border-line accent-accent-500"
                />
                Email
              </label>
              <label className="flex items-center gap-2.5 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={values.notifyBySms}
                  onChange={(e) => set('notifyBySms', e.target.checked)}
                  disabled={!canUpdate}
                  className="h-4 w-4 rounded border-line accent-accent-500"
                />
                SMS
              </label>
              <label className="flex items-center gap-2.5 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={values.notifyByWhatsapp}
                  onChange={(e) => set('notifyByWhatsapp', e.target.checked)}
                  disabled={!canUpdate}
                  className="h-4 w-4 rounded border-line accent-accent-500"
                />
                WhatsApp
              </label>
            </div>
            <p className="text-xs text-ink-muted">When a customer has a mobile number and both SMS and WhatsApp are enabled, WhatsApp is used — not both.</p>

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
