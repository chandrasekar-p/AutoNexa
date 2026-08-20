'use client';

import { useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api-client';
import { validateAppointmentForm, type AppointmentFormErrors, type AppointmentFormValues } from '@/lib/validation/appointment';
import { useStaffOptions } from '@/lib/hooks/use-staff-options';
import type { Appointment, CustomerRef } from '@/lib/api-types';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
  const staff = useStaffOptions();
  const [values, setValues] = useState({
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

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Service Type"
          value={values.serviceType}
          onChange={(e) => set('serviceType', e.target.value)}
          placeholder="General Service"
          error={errors.serviceType}
          required
        />
        <div />
        <Input
          label="Date"
          type="date"
          value={values.appointmentDate}
          onChange={(e) => set('appointmentDate', e.target.value)}
          error={errors.appointmentDate}
          required
        />
        <Input
          label="Time"
          value={values.appointmentTime}
          onChange={(e) => set('appointmentTime', e.target.value)}
          placeholder="10:30 AM"
          error={errors.appointmentTime}
          required
        />
        {staff.isAvailable ? (
          <>
            <Select
              label="Service Advisor"
              value={values.serviceAdvisorId}
              onChange={(e) => set('serviceAdvisorId', e.target.value)}
              error={errors.serviceAdvisorId}
            >
              <option value="">—</option>
              {staff.options.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select
              label="Technician"
              value={values.technicianId}
              onChange={(e) => set('technicianId', e.target.value)}
              error={errors.technicianId}
            >
              <option value="">—</option>
              {staff.options.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </>
        ) : null}
      </div>

      <Textarea label="Notes" value={values.notes} onChange={(e) => set('notes', e.target.value)} error={errors.notes} />

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
