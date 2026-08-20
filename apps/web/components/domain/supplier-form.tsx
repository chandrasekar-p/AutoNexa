'use client';

import { useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api-client';
import { validateSupplierForm, type SupplierFormErrors, type SupplierFormValues } from '@/lib/validation/supplier';
import type { Supplier } from '@/lib/api-types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface SupplierFormProps {
  initial?: Supplier;
  submitLabel: string;
  onSubmit: (values: SupplierFormValues) => Promise<void>;
  onCancel: () => void;
}

export function SupplierForm({ initial, submitLabel, onSubmit, onCancel }: SupplierFormProps) {
  const [values, setValues] = useState({
    name: initial?.name ?? '',
    contactPerson: initial?.contactPerson ?? '',
    mobile: initial?.mobile ?? '',
    email: initial?.email ?? '',
    address: initial?.address ?? '',
    gstin: initial?.gstin ?? '',
    paymentTerms: initial?.paymentTerms ?? '',
  });
  const [errors, setErrors] = useState<SupplierFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = validateSupplierForm(values);
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
        <p
          role="alert"
          className="rounded border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400"
        >
          {formError}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Name" value={values.name} onChange={(e) => set('name', e.target.value)} error={errors.name} required />
        <Input
          label="Contact Person"
          value={values.contactPerson}
          onChange={(e) => set('contactPerson', e.target.value)}
          error={errors.contactPerson}
        />
        <Input label="Mobile" value={values.mobile} onChange={(e) => set('mobile', e.target.value)} error={errors.mobile} />
        <Input
          label="Email"
          type="email"
          value={values.email}
          onChange={(e) => set('email', e.target.value)}
          error={errors.email}
        />
        <Input
          label="GSTIN"
          value={values.gstin}
          onChange={(e) => set('gstin', e.target.value.toUpperCase())}
          error={errors.gstin}
        />
        <Input
          label="Payment Terms"
          value={values.paymentTerms}
          onChange={(e) => set('paymentTerms', e.target.value)}
          placeholder="Net 30"
          error={errors.paymentTerms}
        />
      </div>

      <Textarea label="Address" value={values.address} onChange={(e) => set('address', e.target.value)} error={errors.address} />

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
