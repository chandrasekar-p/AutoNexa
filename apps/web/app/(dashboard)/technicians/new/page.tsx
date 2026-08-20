'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { Technician } from '@/lib/api-types';
import { Card, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

interface UserOption {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

export default function NewTechnicianPage() {
  const router = useRouter();
  const users = useApiQuery<UserOption[]>(() => apiGet('/users'), []);

  const [userId, setUserId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [skills, setSkills] = useState('');
  const [specialisation, setSpecialisation] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) {
      setFormError('Select which user this technician profile is for.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      const technician = await apiPost<Technician>('/technicians', {
        userId,
        employeeId: employeeId || undefined,
        skills: skills ? skills.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        specialisation: specialisation || undefined,
        experienceYears: experienceYears ? Number(experienceYears) : undefined,
      });
      router.push(`/technicians/${technician.id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  }

  const activeUsers = (users.data ?? []).filter((u) => u.isActive);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">New Technician</h1>
        <p className="text-sm text-ink-secondary">
          Turns an existing user into a technician profile with skills and workload tracking.
        </p>
      </div>

      {users.isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {users.error ? <ErrorState message={users.error} onRetry={users.refetch} /> : null}

      {users.data ? (
        <Card>
          <CardBody className="pt-5">
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <Select label="User" value={userId} onChange={(e) => setUserId(e.target.value)} required>
                <option value="">Select a user…</option>
                {activeUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </Select>
              <Input label="Employee ID" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
              <Input
                label="Skills"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="engine, electrical, AC (comma-separated)"
              />
              <Input
                label="Specialisation"
                value={specialisation}
                onChange={(e) => setSpecialisation(e.target.value)}
                placeholder="AC Specialist"
              />
              <Input
                label="Experience (years)"
                type="number"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                className="max-w-xs"
              />

              {formError ? (
                <p
                  role="alert"
                  className="rounded border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400"
                >
                  {formError}
                </p>
              ) : null}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => router.back()} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  Create Technician
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
