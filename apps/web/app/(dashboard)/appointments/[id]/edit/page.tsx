'use client';

import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiPatch } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { AppointmentFormValues } from '@/lib/validation/appointment';
import type { Appointment } from '@/lib/api-types';
import { AppointmentForm } from '@/components/domain/appointment-form';
import { Card, CardBody } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

export default function EditAppointmentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const query = useApiQuery<Appointment>(() => apiGet(`/appointments/${params.id}`), [params.id]);

  async function handleSubmit(values: AppointmentFormValues) {
    await apiPatch<Appointment>(`/appointments/${params.id}`, values);
    router.push(`/appointments/${params.id}`);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Edit Appointment</h1>
        <p className="text-sm text-ink-secondary">Update this appointment&rsquo;s details.</p>
      </div>

      {query.isLoading ? <Skeleton className="h-96 w-full" /> : null}
      {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}

      {query.data ? (
        <Card>
          <CardBody className="pt-5">
            <AppointmentForm
              customer={query.data.customer}
              vehicle={query.data.vehicle}
              initial={query.data}
              submitLabel="Save Changes"
              onSubmit={handleSubmit}
              onCancel={() => router.back()}
            />
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
