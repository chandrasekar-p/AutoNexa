'use client';

import { useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api-client';
import { validateSupplierForm, type SupplierFormErrors, type SupplierFormValues } from '@/lib/validation/supplier';
import type { Supplier } from '@/lib/api-types';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface SupplierFormProps {
  initial?: Supplier;
  submitLabel: string;
  onSubmit: (values: SupplierFormValues) => Promise<void>;
  onCancel: () => void;
}

const PAYMENT_TERM_PRESETS = ['Net 15', 'Net 30', 'Net 45', 'Net 60'] as const;
const CUSTOM_PAYMENT_TERM = 'Custom';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">{children}</h2>;
}

export function SupplierForm({ initial, submitLabel, onSubmit, onCancel }: SupplierFormProps) {
  const initialPaymentTerms = initial?.paymentTerms ?? '';
  const initialIsPreset = (PAYMENT_TERM_PRESETS as readonly string[]).includes(initialPaymentTerms);

  const [values, setValues] = useState({
    name: initial?.name ?? '',
    contactPerson: initial?.contactPerson ?? '',
    mobile: initial?.mobile ?? '',
    email: initial?.email ?? '',
    address: initial?.address ?? '',
    gstin: initial?.gstin ?? '',
    paymentTerms: initialPaymentTerms,
    isActive: initial?.isActive ?? true,
  });
  const [paymentTermsMode, setPaymentTermsMode] = useState<'preset' | 'custom'>(
    initialPaymentTerms && !initialIsPreset ? 'custom' : 'preset',
  );
  const [errors, setErrors] = useState<SupplierFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handlePaymentTermsSelect(value: string) {
    if (value === CUSTOM_PAYMENT_TERM) {
      setPaymentTermsMode('custom');
      set('paymentTerms', '');
    } else {
      setPaymentTermsMode('preset');
      set('paymentTerms', value);
    }
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
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      {formError ? (
        <p
          role="alert"
          className="rounded border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400"
        >
          {formError}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <SectionTitle>Basic Information</SectionTitle>
          <Input label="Supplier Name" value={values.name} onChange={(e) => set('name', e.target.value)} error={errors.name} required />
          <Input
            label="Contact Person"
            value={values.contactPerson}
            onChange={(e) => set('contactPerson', e.target.value)}
            error={errors.contactPerson}
          />
        </div>

        <div className="flex flex-col gap-4">
          <SectionTitle>Business Information</SectionTitle>
          <Input
            label="GSTIN"
            value={values.gstin}
            onChange={(e) => set('gstin', e.target.value.toUpperCase())}
            error={errors.gstin}
            placeholder="e.g. 33AAAAA0000A1Z5"
          />
          <p className="-mt-2 text-xs text-ink-muted">Required for GST-enabled suppliers.</p>
        </div>

        <div className="flex flex-col gap-4">
          <SectionTitle>Contact &amp; Communication</SectionTitle>
          <Input label="Mobile" value={values.mobile} onChange={(e) => set('mobile', e.target.value)} error={errors.mobile} placeholder="+91 98765 43210" />
          <Input label="Email" type="email" value={values.email} onChange={(e) => set('email', e.target.value)} error={errors.email} />
        </div>

        <div className="flex flex-col gap-4">
          <SectionTitle>Billing Address</SectionTitle>
          <Textarea label="Address" value={values.address} onChange={(e) => set('address', e.target.value)} error={errors.address} />
        </div>

        <div className="flex flex-col gap-4">
          <SectionTitle>Payment &amp; Terms</SectionTitle>
          <Select
            label="Payment Terms"
            value={paymentTermsMode === 'custom' ? CUSTOM_PAYMENT_TERM : values.paymentTerms}
            onChange={(e) => handlePaymentTermsSelect(e.target.value)}
          >
            <option value="">Select payment terms…</option>
            {PAYMENT_TERM_PRESETS.map((term) => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
            <option value={CUSTOM_PAYMENT_TERM}>Custom…</option>
          </Select>
          <p className="-mt-2 text-xs text-ink-muted">When payment is expected after receiving the invoice.</p>
          {paymentTermsMode === 'custom' ? (
            <Input
              label="Custom Payment Terms"
              value={values.paymentTerms}
              onChange={(e) => set('paymentTerms', e.target.value)}
              error={errors.paymentTerms}
              placeholder="e.g. 50% advance, balance on delivery"
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <SectionTitle>Status</SectionTitle>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="radio" name="isActive" checked={values.isActive} onChange={() => set('isActive', true)} className="h-4 w-4 accent-accent-500" />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="radio" name="isActive" checked={!values.isActive} onChange={() => set('isActive', false)} className="h-4 w-4 accent-accent-500" />
              Inactive
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-line pt-5">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {isSubmitting ? (initial ? 'Saving Changes…' : 'Creating Supplier…') : submitLabel}
        </Button>
      </div>
    </form>
  );
}
