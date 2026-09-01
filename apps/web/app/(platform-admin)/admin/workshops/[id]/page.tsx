'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet, apiPatch, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { formatDate, daysUntil } from '@/lib/format';
import type { Tenant } from '@/lib/api-types';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Toast } from '@/components/ui/toast';

const PLAN_LABEL: Record<string, string> = { trial: 'Trial', starter: 'Starter', pro: 'Pro', standard: 'Standard' };

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-micro font-semibold uppercase tracking-wide text-ink-secondary">{label}</span>
      <span className="text-sm text-ink">{value}</span>
    </div>
  );
}

function trialSummary(tenant: Tenant): string {
  if (!tenant.trialEndsAt) return 'No trial (permanent)';
  const days = daysUntil(tenant.trialEndsAt);
  if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago (${formatDate(tenant.trialEndsAt)})`;
  return `${days} day${days === 1 ? '' : 's'} left (ends ${formatDate(tenant.trialEndsAt)})`;
}

/** "YYYY-MM-DD" for the date input — trialEndsAt arrives as a full ISO datetime string. */
function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

export default function WorkshopDetailPage() {
  const params = useParams<{ id: string }>();
  const query = useApiQuery<Tenant>(() => apiGet(`/tenants/${params.id}`), [params.id]);

  const [planTier, setPlanTier] = useState<string | null>(null);
  const [trialDate, setTrialDate] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSave() {
    if (!query.data) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const nextPlanTier = planTier ?? query.data.planTier;
      await apiPatch(`/tenants/${params.id}/plan`, {
        planTier: nextPlanTier,
        // Explicit null clears the trial — sent whenever the plan is no
        // longer "trial" and there's no draft date override in progress.
        trialEndsAt: trialDate !== null ? new Date(trialDate).toISOString() : nextPlanTier === 'trial' ? undefined : null,
      });
      setPlanTier(null);
      setTrialDate(null);
      setSuccessMessage('Plan updated.');
      query.refetch();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.error) {
    return <ErrorState message={query.error} onRetry={query.refetch} />;
  }

  const tenant = query.data;
  if (!tenant) return null;

  const currentPlanTier = planTier ?? tenant.planTier;
  const dirty = planTier !== null || trialDate !== null;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/workshops" className="text-sm text-ink-secondary hover:text-ink">
            &larr; Back to Workshops
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-ink">{tenant.name}</h1>
            <Badge tone={tenant.isActive ? 'success' : 'neutral'}>{tenant.isActive ? 'Active' : 'Inactive'}</Badge>
          </div>
          <p className="text-sm text-ink-secondary">{tenant.slug}</p>
        </div>
      </div>

      {successMessage ? <Toast message={successMessage} onDismiss={() => setSuccessMessage(null)} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Workshop Details</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2">
          <Field label="GSTIN" value={tenant.gstin ?? '—'} />
          <Field label="Created" value={formatDate(tenant.createdAt)} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan & Trial</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-4 pt-3">
          <Field label="Current Plan" value={PLAN_LABEL[tenant.planTier] ?? tenant.planTier} />
          <Field label="Trial Status" value={trialSummary(tenant)} />

          <div className="grid grid-cols-1 gap-4 border-t border-line pt-4 sm:grid-cols-2">
            <Select label="Plan" value={currentPlanTier} onChange={(e) => setPlanTier(e.target.value)}>
              <option value="trial">Trial</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="standard">Standard</option>
            </Select>
            <DatePicker
              label="Trial Ends On"
              value={trialDate ?? (tenant.trialEndsAt ? toDateInputValue(tenant.trialEndsAt) : '')}
              onChange={setTrialDate}
              disabled={currentPlanTier !== 'trial'}
            />
          </div>
          <p className="text-xs text-ink-muted">
            Switching the plan away from Trial clears the trial end date (the workshop becomes a permanent/paid tenant). Extend the
            trial by picking a later date above without changing the plan.
          </p>

          {saveError ? <p className="text-xs text-danger-600 dark:text-danger-400">{saveError}</p> : null}

          {dirty ? (
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPlanTier(null);
                  setTrialDate(null);
                  setSaveError(null);
                }}
                disabled={isSaving}
              >
                Discard
              </Button>
              <Button size="sm" onClick={handleSave} isLoading={isSaving}>
                Save Changes
              </Button>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
