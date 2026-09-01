'use client';

import { useState } from 'react';
import type { AppointmentFormErrors, AppointmentFormValues } from '@/lib/validation/appointment';
import { useStaffOptions } from '@/lib/hooks/use-staff-options';
import { SERVICE_TYPE_PRESETS, OTHER_SERVICE_TYPE, estimatedDurationFor } from '@/lib/data/service-types';
import { formatDurationMinutes } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const NOTES_MAX_LENGTH = 300;

interface AppointmentDetailsFieldsProps {
  values: AppointmentFormValues;
  errors: AppointmentFormErrors;
  onChange: <K extends keyof AppointmentFormValues>(key: K, value: AppointmentFormValues[K]) => void;
}

/**
 * The actual field set shared between the single-step edit form
 * (AppointmentForm) and the New Appointment wizard's Step 1 — extracted so
 * both stay in sync rather than drifting into two copies of the same grid.
 */
export function AppointmentDetailsFields({ values, errors, onChange }: AppointmentDetailsFieldsProps) {
  const staff = useStaffOptions();
  const isKnownPreset = SERVICE_TYPE_PRESETS.some((p) => p.label === values.serviceType);
  // A stored value that isn't in the curated list (or is empty, for a
  // brand-new appointment) still needs to render as "Other" with its own
  // text box, rather than silently vanishing from the dropdown — same
  // defensive-fallback pattern as the Vehicle Brand/Colour pickers.
  const [showOtherInput, setShowOtherInput] = useState(!isKnownPreset && values.serviceType !== '');
  const duration = estimatedDurationFor(values.serviceType);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Select
            label="Service Type"
            value={showOtherInput ? OTHER_SERVICE_TYPE : values.serviceType}
            onChange={(e) => {
              if (e.target.value === OTHER_SERVICE_TYPE) {
                setShowOtherInput(true);
                onChange('serviceType', '');
              } else {
                setShowOtherInput(false);
                onChange('serviceType', e.target.value);
              }
            }}
            error={showOtherInput ? undefined : errors.serviceType}
            required
          >
            <option value="">Select a service…</option>
            {SERVICE_TYPE_PRESETS.map((preset) => (
              <option key={preset.label} value={preset.label}>
                {preset.label}
              </option>
            ))}
            <option value={OTHER_SERVICE_TYPE}>{OTHER_SERVICE_TYPE}</option>
          </Select>
          {showOtherInput ? (
            <Input
              value={values.serviceType}
              onChange={(e) => onChange('serviceType', e.target.value)}
              placeholder="Describe the service"
              error={errors.serviceType}
            />
          ) : null}
          {duration ? <p className="text-xs text-ink-muted">Estimated duration: ~{formatDurationMinutes(duration)}</p> : null}
        </div>
        <div />
        <DatePicker
          label="Date"
          value={values.appointmentDate}
          onChange={(v) => onChange('appointmentDate', v)}
          error={errors.appointmentDate}
          required
        />
        <TimePicker
          label="Time"
          value={values.appointmentTime}
          onChange={(time) => onChange('appointmentTime', time)}
          error={errors.appointmentTime}
          required
        />
        {staff.isAvailable ? (
          <>
            <Select
              label="Service Advisor"
              value={values.serviceAdvisorId}
              onChange={(e) => onChange('serviceAdvisorId', e.target.value)}
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
              onChange={(e) => onChange('technicianId', e.target.value)}
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

      <div className="flex flex-col gap-1.5">
        <Textarea
          label="Notes"
          value={values.notes}
          onChange={(e) => onChange('notes', e.target.value)}
          error={errors.notes}
          maxLength={NOTES_MAX_LENGTH}
        />
        <span className="self-end text-xs text-ink-muted">
          {(values.notes ?? '').length}/{NOTES_MAX_LENGTH}
        </span>
      </div>
    </div>
  );
}
