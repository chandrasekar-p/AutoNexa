'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet, apiPatch, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { formatMoney, formatNumber } from '@/lib/format';
import type { TechnicianDetail, TechnicianStatus } from '@/lib/api-types';
import { TechnicianStatusBadge } from '@/components/domain/technician-status-badge';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-micro font-semibold uppercase tracking-wide text-ink-secondary">{label}</span>
      <span className="num text-2xl font-semibold text-ink">{value}</span>
    </div>
  );
}

export default function TechnicianDetailPage() {
  const params = useParams<{ id: string }>();
  const canUpdate = usePermission('technician:update');

  const query = useApiQuery<TechnicianDetail>(() => apiGet(`/technicians/${params.id}`), [params.id]);

  const [status, setStatus] = useState<TechnicianStatus | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [skills, setSkills] = useState<string | null>(null);
  const [specialisation, setSpecialisation] = useState<string | null>(null);
  const [experienceYears, setExperienceYears] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave() {
    if (!query.data) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await apiPatch(`/technicians/${params.id}`, {
        status: status ?? query.data.status,
        employeeId: (employeeId ?? query.data.employeeId ?? '') || undefined,
        skills:
          skills !== null
            ? skills.split(',').map((s) => s.trim()).filter(Boolean)
            : query.data.skills,
        specialisation: (specialisation ?? query.data.specialisation ?? '') || undefined,
        experienceYears: experienceYears !== null ? Number(experienceYears) : (query.data.experienceYears ?? undefined),
      });
      setStatus(null);
      setEmployeeId(null);
      setSkills(null);
      setSpecialisation(null);
      setExperienceYears(null);
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

  const technician = query.data;
  if (!technician) return null;

  const dirty = status !== null || employeeId !== null || skills !== null || specialisation !== null || experienceYears !== null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-ink">{technician.user.name}</h1>
            <TechnicianStatusBadge status={technician.status} />
          </div>
          <p className="text-sm text-ink-secondary">{technician.user.email}</p>
        </div>
        <Link href="/technicians" className="self-center text-sm text-ink-secondary hover:text-ink">
          &larr; Back to technicians
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardBody className="py-4">
            <Stat label="Open Jobs" value={formatNumber(technician.jobsOpen)} />
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <Stat label="Completed Jobs" value={formatNumber(technician.jobsCompleted)} />
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <Stat label="Labour Hours" value={technician.totalLabourHours} />
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <Stat label="Revenue Generated" value={formatMoney(technician.revenueGenerated)} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Phone" value={technician.user.phone ?? '—'} disabled />
            {canUpdate ? (
              <Select label="Status" value={status ?? technician.status} onChange={(e) => setStatus(e.target.value as TechnicianStatus)}>
                <option value="ACTIVE">Active</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="INACTIVE">Inactive</option>
              </Select>
            ) : (
              <Field label="Status" value={technician.status} />
            )}
            {canUpdate ? (
              <Input
                label="Employee ID"
                value={employeeId ?? technician.employeeId ?? ''}
                onChange={(e) => setEmployeeId(e.target.value)}
              />
            ) : (
              <Field label="Employee ID" value={technician.employeeId ?? '—'} />
            )}
            {canUpdate ? (
              <Input
                label="Experience (years)"
                type="number"
                value={experienceYears ?? technician.experienceYears ?? ''}
                onChange={(e) => setExperienceYears(e.target.value)}
              />
            ) : (
              <Field label="Experience" value={technician.experienceYears !== null ? `${technician.experienceYears} years` : '—'} />
            )}
            {canUpdate ? (
              <Input
                label="Specialisation"
                value={specialisation ?? technician.specialisation ?? ''}
                onChange={(e) => setSpecialisation(e.target.value)}
              />
            ) : (
              <Field label="Specialisation" value={technician.specialisation ?? '—'} />
            )}
            {canUpdate ? (
              <Input
                label="Skills"
                value={skills ?? technician.skills.join(', ')}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="engine, electrical, AC"
              />
            ) : (
              <Field label="Skills" value={technician.skills.join(', ') || '—'} />
            )}
          </div>

          {saveError ? (
            <p className="text-xs text-danger-600 dark:text-danger-400">{saveError}</p>
          ) : null}

          {canUpdate && dirty ? (
            <div className="flex justify-end">
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-micro font-semibold uppercase tracking-wide text-ink-secondary">{label}</span>
      <span className="text-sm text-ink">{value}</span>
    </div>
  );
}
