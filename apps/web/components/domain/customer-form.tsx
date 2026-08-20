'use client';

import { useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api-client';
import { validateCustomerForm, type CustomerFormErrors, type CustomerFormValues } from '@/lib/validation/customer';
import type { Customer } from '@/lib/api-types';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface CustomerFormProps {
  initial?: Customer;
  submitLabel: string;
  onSubmit: (values: CustomerFormValues) => Promise<void>;
  onCancel: () => void;
}

/**
 * Shared between the create (/customers/new) and edit (/customers/[id]/edit)
 * pages — same fields, same validation, same layout either way. The
 * backend's PATCH accepts a partial payload, but we always send the full
 * form here for simplicity; there's no meaningful difference for the user.
 */
export function CustomerForm({ initial, submitLabel, onSubmit, onCancel }: CustomerFormProps) {
  const [values, setValues] = useState({
    name: initial?.name ?? '',
    mobile: initial?.mobile ?? '',
    altMobile: initial?.altMobile ?? '',
    email: initial?.email ?? '',
    address: initial?.address ?? '',
    city: initial?.city ?? '',
    state: initial?.state ?? '',
    gstin: initial?.gstin ?? '',
    customerType: initial?.customerType ?? 'individual',
    notes: initial?.notes ?? '',
  });
  const [errors, setErrors] = useState<CustomerFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = validateCustomerForm(values);
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
      {formError ? (
        <p role="alert" className="rounded border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400">
          {formError}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Name"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          error={errors.name}
          required
        />
        <Input
          label="Mobile"
          value={values.mobile}
          onChange={(e) => set('mobile', e.target.value)}
          placeholder="+91 98765 43210"
          error={errors.mobile}
          required
        />
        <Input
          label="Alternate mobile"
          value={values.altMobile}
          onChange={(e) => set('altMobile', e.target.value)}
          error={errors.altMobile}
        />
        <Input
          label="Email"
          type="email"
          value={values.email}
          onChange={(e) => set('email', e.target.value)}
          error={errors.email}
        />
        <Input label="City" value={values.city} onChange={(e) => set('city', e.target.value)} error={errors.city} />
        <Input
          label="State"
          value={values.state}
          onChange={(e) => set('state', e.target.value)}
          error={errors.state}
        />
        <Input
          label="GSTIN"
          value={values.gstin}
          onChange={(e) => set('gstin', e.target.value.toUpperCase())}
          error={errors.gstin}
        />
        <Select
          label="Customer type"
          value={values.customerType}
          onChange={(e) => set('customerType', e.target.value as CustomerFormValues['customerType'])}
          error={errors.customerType}
        >
          <option value="individual">Individual</option>
          <option value="business">Business</option>
        </Select>
      </div>

      <Textarea
        label="Address"
        value={values.address}
        onChange={(e) => set('address', e.target.value)}
        error={errors.address}
      />
      <Textarea
        label="Notes"
        value={values.notes}
        onChange={(e) => set('notes', e.target.value)}
        error={errors.notes}
      />

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
