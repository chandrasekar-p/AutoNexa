'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { apiGet, apiPatch, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { TechnicianDetail } from '@/lib/api-types';
import { TechnicianForm, type TechnicianFormValues } from '@/components/domain/technician-form';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Toast } from '@/components/ui/toast';

export default function EditTechnicianPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const query = useApiQuery<TechnicianDetail>(() => apiGet(`/technicians/${params.id}`), [params.id]);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(values: TechnicianFormValues) {
    setFormError(null);
    setIsSubmitting(true);
    try {
      await apiPatch(`/technicians/${params.id}`, {
        employeeId: values.employeeId,
        skills: values.skills,
        specialisation: values.specialisation,
        experienceYears: values.experienceYears,
        maxConcurrentJobs: values.maxConcurrentJobs,
        workingDays: values.workingDays,
        workingHoursStart: values.workingHoursStart || undefined,
        workingHoursEnd: values.workingHoursEnd || undefined,
        status: values.status,
      });
      setSuccessMessage('Technician updated successfully.');
      setTimeout(() => router.push('/technicians'), 900);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Edit Technician</h1>
          <p className="text-sm text-ink-secondary">Update technician profile, skills, availability and workload settings.</p>
        </div>
        <Link href={`/technicians/${params.id}`}>
          <Button type="button" variant="secondary" size="sm">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Back to Technicians
          </Button>
        </Link>
      </div>

      {query.isLoading ? <Skeleton className="h-96 w-full" /> : null}
      {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}

      {query.data ? (
        <Card>
          <CardBody className="pt-5">
            <TechnicianForm
              user={query.data.user}
              initial={{
                employeeId: query.data.employeeId ?? '',
                skills: query.data.skills,
                specialisation: query.data.specialisation ?? '',
                experienceYears: query.data.experienceYears ?? 0,
                maxConcurrentJobs: query.data.maxConcurrentJobs,
                workingDays: query.data.workingDays,
                workingHoursStart: query.data.workingHoursStart ?? '',
                workingHoursEnd: query.data.workingHoursEnd ?? '',
                status: query.data.status,
              }}
              submitLabel={isSubmitting ? 'Saving Changes…' : 'Save Changes'}
              isSubmitting={isSubmitting}
              formError={formError}
              onSubmit={handleSubmit}
              onCancel={() => router.push(`/technicians/${params.id}`)}
            />
          </CardBody>
        </Card>
      ) : null}

      {successMessage ? <Toast message={successMessage} onDismiss={() => setSuccessMessage(null)} /> : null}
    </div>
  );
}
