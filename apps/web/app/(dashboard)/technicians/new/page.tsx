'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { PaginatedResult, Technician, TechnicianDetail } from '@/lib/api-types';
import { TechnicianForm, type TechnicianFormValues } from '@/components/domain/technician-form';
import { Card, CardBody } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Toast } from '@/components/ui/toast';

interface UserOption {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
}

export default function NewTechnicianPage() {
  const router = useRouter();
  const users = useApiQuery<UserOption[]>(() => apiGet('/users'), []);
  // The backend 409s if the picked user is already a technician
  // (assertUserNotAlreadyTechnician) — fetching the existing roster too
  // lets the picker exclude them up front instead of offering a doomed
  // submission.
  const existingTechnicians = useApiQuery<PaginatedResult<Technician>>(() => apiGet('/technicians?pageSize=100'), []);

  const [userId, setUserId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const usedUserIds = new Set((existingTechnicians.data?.items ?? []).map((t) => t.userId));
  const availableUsers = (users.data ?? []).filter((u) => u.isActive && !usedUserIds.has(u.id));
  const selectedUser = availableUsers.find((u) => u.id === userId) ?? null;

  async function handleSubmit(values: TechnicianFormValues) {
    if (!selectedUser) {
      setFormError('Select which user this technician profile is for.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      await apiPost<TechnicianDetail>('/technicians', {
        userId: selectedUser.id,
        employeeId: values.employeeId,
        skills: values.skills,
        specialisation: values.specialisation,
        experienceYears: values.experienceYears,
        maxConcurrentJobs: values.maxConcurrentJobs,
        workingDays: values.workingDays,
        workingHoursStart: values.workingHoursStart || undefined,
        workingHoursEnd: values.workingHoursEnd || undefined,
      });
      setSuccessMessage('Technician created successfully.');
      setTimeout(() => router.push('/technicians'), 900);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  }

  const isLoading = users.isLoading || existingTechnicians.isLoading;
  const loadError = users.error ?? existingTechnicians.error;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">New Technician</h1>
          <p className="text-sm text-ink-secondary">Create a technician profile and configure skills, availability and workload tracking.</p>
        </div>
        <Link href="/technicians">
          <Button type="button" variant="secondary" size="sm">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Back to Technicians
          </Button>
        </Link>
      </div>

      {isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {loadError ? <ErrorState message={loadError} onRetry={() => { users.refetch(); existingTechnicians.refetch(); }} /> : null}

      {!isLoading && !loadError ? (
        <Card>
          <CardBody className="flex flex-col gap-6 pt-5">
            {!selectedUser ? (
              <div className="max-w-md">
                <Select label="User *" value={userId} onChange={(e) => setUserId(e.target.value)}>
                  <option value="">Select existing user…</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </Select>
                {availableUsers.length === 0 ? (
                  <p className="mt-2 text-xs text-ink-muted">Every active user already has a technician profile.</p>
                ) : null}
              </div>
            ) : (
              <div className="flex h-10 w-fit items-center justify-between gap-4 rounded border border-line bg-surface-hover px-3">
                <span className="text-sm text-ink">
                  {selectedUser.name} <span className="text-ink-muted">· {selectedUser.email}</span>
                </span>
                <button type="button" onClick={() => setUserId('')} className="text-xs text-accent-600 hover:underline">
                  Change
                </button>
              </div>
            )}

            {selectedUser ? (
              <TechnicianForm
                user={selectedUser}
                submitLabel={isSubmitting ? 'Creating Technician…' : 'Create Technician'}
                isSubmitting={isSubmitting}
                formError={formError}
                onSubmit={handleSubmit}
                onCancel={() => router.push('/technicians')}
              />
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {successMessage ? <Toast message={successMessage} onDismiss={() => setSuccessMessage(null)} /> : null}
    </div>
  );
}
