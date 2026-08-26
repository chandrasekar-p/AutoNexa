'use client';

import { useState, type FormEvent } from 'react';
import { Minus, Plus } from 'lucide-react';
import { SectionHeading } from './section-heading';
import { SkillTagInput } from './skill-tag-input';
import { TimePicker } from '@/components/ui/time-picker';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TECHNICIAN_SPECIALISATIONS, OTHER_SPECIALISATION } from '@/lib/data/technician-specialisations';
import type { TechnicianStatus } from '@/lib/api-types';
import { cn } from '@/lib/cn';

const WORKING_DAYS: { code: string; label: string }[] = [
  { code: 'MON', label: 'Mon' },
  { code: 'TUE', label: 'Tue' },
  { code: 'WED', label: 'Wed' },
  { code: 'THU', label: 'Thu' },
  { code: 'FRI', label: 'Fri' },
  { code: 'SAT', label: 'Sat' },
  { code: 'SUN', label: 'Sun' },
];

export interface TechnicianFormValues {
  employeeId: string;
  skills: string[];
  specialisation: string;
  experienceYears: number;
  maxConcurrentJobs: number;
  workingDays: string[];
  workingHoursStart: string;
  workingHoursEnd: string;
  status: TechnicianStatus;
}

export interface TechnicianFormErrors {
  employeeId?: string;
  specialisation?: string;
  skills?: string;
}

interface TechnicianFormProps {
  /** The resolved user this profile belongs to — picked in New mode before this form renders, fixed/read-only in Edit mode (a technician profile isn't reassigned to a different user, same rule as Vehicle → Customer). */
  user: { name: string; email: string; phone: string | null };
  initial?: Partial<TechnicianFormValues>;
  submitLabel: string;
  isSubmitting: boolean;
  formError: string | null;
  onSubmit: (values: TechnicianFormValues) => void;
  onCancel: () => void;
}

const DEFAULT_VALUES: TechnicianFormValues = {
  employeeId: '',
  skills: [],
  specialisation: '',
  experienceYears: 0,
  maxConcurrentJobs: 4,
  workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  workingHoursStart: '',
  workingHoursEnd: '',
  status: 'ACTIVE',
};

export function TechnicianForm({ user, initial, submitLabel, isSubmitting, formError, onSubmit, onCancel }: TechnicianFormProps) {
  const [values, setValues] = useState<TechnicianFormValues>({ ...DEFAULT_VALUES, ...initial });
  const [errors, setErrors] = useState<TechnicianFormErrors>({});
  const isKnownSpecialisation = TECHNICIAN_SPECIALISATIONS.includes(values.specialisation);
  const [showOtherSpecialisation, setShowOtherSpecialisation] = useState(!isKnownSpecialisation && values.specialisation !== '');

  function set<K extends keyof TechnicianFormValues>(key: K, value: TechnicianFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function toggleWorkingDay(code: string) {
    setValues((v) => ({
      ...v,
      workingDays: v.workingDays.includes(code) ? v.workingDays.filter((d) => d !== code) : [...v.workingDays, code],
    }));
  }

  function validate(): boolean {
    const nextErrors: TechnicianFormErrors = {};
    if (!values.employeeId.trim()) nextErrors.employeeId = 'Employee ID is required.';
    if (!values.specialisation.trim()) nextErrors.specialisation = 'Specialisation is required.';
    if (values.skills.length === 0) nextErrors.skills = 'At least one skill is required.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4">
          <SectionHeading number={1} title="Profile Information" />
          <Input label="Full Name" value={user.name} disabled />
          <Input
            label="Employee ID *"
            value={values.employeeId}
            onChange={(e) => set('employeeId', e.target.value)}
            onBlur={() => setErrors((e) => ({ ...e, employeeId: values.employeeId.trim() ? undefined : 'Employee ID is required.' }))}
            placeholder="e.g. EMP-1003"
            error={errors.employeeId}
          />
          <Input label="Phone Number" value={user.phone ?? 'Will be auto-filled from selected user'} disabled />
          <Input label="Email" value={user.email} disabled />
        </div>

        <div className="flex flex-col gap-4">
          <SectionHeading number={2} title="Skills & Specialisation" />
          <div className="flex flex-col gap-1.5">
            <Select
              label="Specialisation *"
              value={showOtherSpecialisation ? OTHER_SPECIALISATION : values.specialisation}
              onChange={(e) => {
                if (e.target.value === OTHER_SPECIALISATION) {
                  setShowOtherSpecialisation(true);
                  set('specialisation', '');
                } else {
                  setShowOtherSpecialisation(false);
                  set('specialisation', e.target.value);
                }
              }}
              error={showOtherSpecialisation ? undefined : errors.specialisation}
            >
              <option value="">Select specialisation…</option>
              {TECHNICIAN_SPECIALISATIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value={OTHER_SPECIALISATION}>{OTHER_SPECIALISATION}</option>
            </Select>
            {showOtherSpecialisation ? (
              <Input
                value={values.specialisation}
                onChange={(e) => set('specialisation', e.target.value)}
                placeholder="Describe the specialisation"
                error={errors.specialisation}
              />
            ) : null}
          </div>

          <SkillTagInput value={values.skills} onChange={(skills) => set('skills', skills)} error={errors.skills} />

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-secondary">Experience (Years)</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => set('experienceYears', Math.max(0, values.experienceYears - 1))}
                aria-label="Decrease experience"
                className="flex h-9 w-9 items-center justify-center rounded border border-line text-ink-secondary hover:bg-surface-hover"
              >
                <Minus className="h-3.5 w-3.5" aria-hidden />
              </button>
              <span className="num w-10 text-center text-sm font-medium text-ink">{values.experienceYears}</span>
              <button
                type="button"
                onClick={() => set('experienceYears', values.experienceYears + 1)}
                aria-label="Increase experience"
                className="flex h-9 w-9 items-center justify-center rounded border border-line text-ink-secondary hover:bg-surface-hover"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </div>

          <Input
            label="Max Concurrent Jobs"
            type="number"
            min={1}
            value={values.maxConcurrentJobs}
            onChange={(e) => set('maxConcurrentJobs', Math.max(1, Number(e.target.value) || 1))}
          />
        </div>

        <div className="flex flex-col gap-4">
          <SectionHeading number={3} title="Work Schedule" />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-secondary">Working Days</span>
            <div className="flex flex-wrap gap-3">
              {WORKING_DAYS.map((day) => (
                <label key={day.code} className="flex items-center gap-1.5 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={values.workingDays.includes(day.code)}
                    onChange={() => toggleWorkingDay(day.code)}
                    className="h-4 w-4 rounded border-line accent-accent-500"
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TimePicker label="Start Time" value={values.workingHoursStart} onChange={(v) => set('workingHoursStart', v)} />
            <TimePicker label="End Time" value={values.workingHoursEnd} onChange={(v) => set('workingHoursEnd', v)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-secondary">Status</span>
            <div className="flex gap-4">
              {(['ACTIVE', 'INACTIVE'] as const).map((s) => (
                <label key={s} className="flex items-center gap-1.5 text-sm text-ink">
                  <input
                    type="radio"
                    name="technician-status"
                    checked={values.status === s}
                    onChange={() => set('status', s)}
                    className="h-4 w-4 border-line accent-accent-500"
                  />
                  {s === 'ACTIVE' ? 'Active' : 'Inactive'}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {formError ? (
        <p
          role="alert"
          className={cn(
            'rounded border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700',
            'dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400',
          )}
        >
          {formError}
        </p>
      ) : null}

      <div className="flex justify-end gap-3 border-t border-line pt-4">
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
