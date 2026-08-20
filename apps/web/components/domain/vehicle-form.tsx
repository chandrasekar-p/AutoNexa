'use client';

import { useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api-client';
import { validateVehicleForm, type VehicleFormErrors, type VehicleFormValues } from '@/lib/validation/vehicle';
import type { CustomerRef, VehicleDetail } from '@/lib/api-types';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface VehicleFormProps {
  /** Fixed for the lifetime of this form — the owning customer is picked before this form ever renders (see the New Vehicle page) and can't be changed on edit (UpdateVehicleDto excludes customerId server-side, by design). */
  customer: CustomerRef;
  initial?: VehicleDetail;
  submitLabel: string;
  onSubmit: (values: VehicleFormValues) => Promise<void>;
  onCancel: () => void;
}

export function VehicleForm({ customer, initial, submitLabel, onSubmit, onCancel }: VehicleFormProps) {
  const [values, setValues] = useState({
    registrationNo: initial?.registrationNo ?? '',
    vin: initial?.vin ?? '',
    brand: initial?.brand ?? '',
    model: initial?.model ?? '',
    variant: initial?.variant ?? '',
    manufactureYear: initial?.manufactureYear ?? NaN,
    fuelType: initial?.fuelType ?? '',
    transmission: initial?.transmission ?? '',
    colour: initial?.colour ?? '',
    odometerReading: initial?.odometerReading ?? NaN,
    insuranceExpiry: initial?.insuranceExpiry?.slice(0, 10) ?? '',
    pucExpiry: initial?.pucExpiry?.slice(0, 10) ?? '',
    warrantyInfo: initial?.warrantyInfo ?? '',
    purchaseDate: initial?.purchaseDate?.slice(0, 10) ?? '',
    notes: initial?.notes ?? '',
  });
  const [errors, setErrors] = useState<VehicleFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = validateVehicleForm(values);
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
      <div className="flex h-10 items-center justify-between rounded border border-line bg-surface-hover px-3">
        <span className="text-sm text-ink">
          {customer.name} <span className="num text-ink-muted">· {customer.mobile}</span>
        </span>
        <span className="text-micro font-semibold uppercase tracking-wide text-ink-muted">Owner</span>
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
          label="Registration Number"
          value={values.registrationNo}
          onChange={(e) => set('registrationNo', e.target.value.toUpperCase())}
          placeholder="TN 37 AB 1234"
          error={errors.registrationNo}
          required
        />
        <Input
          label="VIN / Chassis Number"
          value={values.vin}
          onChange={(e) => set('vin', e.target.value.toUpperCase())}
          error={errors.vin}
        />
        <Input label="Brand" value={values.brand} onChange={(e) => set('brand', e.target.value)} placeholder="BMW" error={errors.brand} required />
        <Input label="Model" value={values.model} onChange={(e) => set('model', e.target.value)} placeholder="X5" error={errors.model} required />
        <Input label="Variant" value={values.variant} onChange={(e) => set('variant', e.target.value)} error={errors.variant} />
        <Input
          label="Manufacture Year"
          type="number"
          value={Number.isNaN(values.manufactureYear) ? '' : values.manufactureYear}
          onChange={(e) => set('manufactureYear', e.target.value === '' ? NaN : Number(e.target.value))}
          error={errors.manufactureYear}
        />
        <Select
          label="Fuel Type"
          value={values.fuelType}
          onChange={(e) => set('fuelType', e.target.value as typeof values.fuelType)}
          error={errors.fuelType}
        >
          <option value="">—</option>
          <option value="petrol">Petrol</option>
          <option value="diesel">Diesel</option>
          <option value="electric">Electric</option>
          <option value="hybrid">Hybrid</option>
          <option value="cng">CNG</option>
        </Select>
        <Select
          label="Transmission"
          value={values.transmission}
          onChange={(e) => set('transmission', e.target.value as typeof values.transmission)}
          error={errors.transmission}
        >
          <option value="">—</option>
          <option value="manual">Manual</option>
          <option value="automatic">Automatic</option>
        </Select>
        <Input label="Colour" value={values.colour} onChange={(e) => set('colour', e.target.value)} error={errors.colour} />
        <Input
          label="Odometer Reading (km)"
          type="number"
          value={Number.isNaN(values.odometerReading) ? '' : values.odometerReading}
          onChange={(e) => set('odometerReading', e.target.value === '' ? NaN : Number(e.target.value))}
          error={errors.odometerReading}
        />
        <Input
          label="Insurance Expiry"
          type="date"
          value={values.insuranceExpiry}
          onChange={(e) => set('insuranceExpiry', e.target.value)}
          error={errors.insuranceExpiry}
        />
        <Input
          label="PUC Expiry"
          type="date"
          value={values.pucExpiry}
          onChange={(e) => set('pucExpiry', e.target.value)}
          error={errors.pucExpiry}
        />
        <Input
          label="Purchase Date"
          type="date"
          value={values.purchaseDate}
          onChange={(e) => set('purchaseDate', e.target.value)}
          error={errors.purchaseDate}
        />
        <Input
          label="Warranty Info"
          value={values.warrantyInfo}
          onChange={(e) => set('warrantyInfo', e.target.value)}
          error={errors.warrantyInfo}
        />
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
