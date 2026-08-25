'use client';

import { useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api-client';
import { validateAppointmentForm, type AppointmentFormErrors, type AppointmentFormValues } from '@/lib/validation/appointment';
import type { Appointment, CustomerRef } from '@/lib/api-types';
import { AppointmentDetailsFields } from '@/components/domain/appointment-details-fields';
import { Button } from '@/components/ui/button';

interface AppointmentFormProps {
  /** Fixed for the lifetime of this form — chosen before this ever renders (see the New Appointment page) and not changeable on edit (UpdateAppointmentDto excludes customerId/vehicleId server-side, by design). */
  customer: CustomerRef;
  vehicle: { id: string; registrationNo: string; brand: string; model: string };
  initial?: Appointment;
  submitLabel: string;
  onSubmit: (values: AppointmentFormValues) => Promise<void>;
  onCancel: () => void;
}

export function AppointmentForm({ customer, vehicle, initial, submitLabel, onSubmit, onCancel }: AppointmentFormProps) {
  const [values, setValues] = useState<AppointmentFormValues>({
    serviceType: initial?.serviceType ?? '',
    appointmentDate: initial?.appointmentDate.slice(0, 10) ?? '',
    appointmentTime: initial?.appointmentTime ?? '',
    serviceAdvisorId: initial?.serviceAdvisorId ?? '',
    technicianId: initial?.technicianId ?? '',
    notes: initial?.notes ?? '',
  });
  const [errors, setErrors] = useState<AppointmentFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function set<K extends keyof AppointmentFormValues>(key: K, value: AppointmentFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = validateAppointmentForm(values);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      await onSubmit(result.data);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex h-10 items-center justify-between rounded border border-line bg-surface-hover px-3">
          <span className="text-sm text-ink">
            {customer.name} <span className="num text-ink-muted">· {customer.mobile}</span>
          </span>
          <span className="text-micro font-semibold uppercase tracking-wide text-ink-muted">Customer</span>
        </div>
        <div className="flex h-10 items-center justify-between rounded border border-line bg-surface-hover px-3">
          <span className="num text-sm text-ink">
            {vehicle.registrationNo} <span className="text-ink-muted">· {vehicle.brand} {vehicle.model}</span>
          </span>
          <span className="text-micro font-semibold uppercase tracking-wide text-ink-muted">Vehicle</span>
        </div>
      </div>

      {formError ? (
        <p
          role="alert"
          className="rounded border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400"
        >
          {formError}
        </p>
      ) : null}

      <AppointmentDetailsFields values={values} errors={errors} onChange={set} />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
