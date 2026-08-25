'use client';

import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Upload, X } from 'lucide-react';
import { apiPost, ApiError } from '@/lib/api-client';
import { validateVehicleForm, type VehicleFormErrors, type VehicleFormValues } from '@/lib/validation/vehicle';
import { VEHICLE_BRANDS, MODELS_BY_BRAND, FUEL_TYPES, TRANSMISSIONS, VEHICLE_COLOURS, WARRANTY_PRESETS } from '@/lib/data/vehicle-brands';
import type { CustomerRef, VehicleDetail } from '@/lib/api-types';
import { daysUntil, initialsFor } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { SectionHeading } from '@/components/domain/section-heading';
import { cn } from '@/lib/cn';

interface VehicleFormProps {
  /** Fixed for the lifetime of this form — the owning customer is picked before this form ever renders (see the New Vehicle page) and can't be changed on edit (UpdateVehicleDto excludes customerId server-side, by design). */
  customer: CustomerRef;
  initial?: VehicleDetail;
  submitLabel: string;
  onSubmit: (values: VehicleFormValues) => Promise<void>;
  onCancel: () => void;
  /** Extra content rendered in the right-hand column — used by the New Vehicle page for its "Why these details?" panel. Edit doesn't pass one. */
  sidebarExtra?: ReactNode;
}

const OTHER_VALUE = '__other__';
const NOTES_MAX_LENGTH = 300;
const CURRENT_YEAR = new Date().getFullYear();
const MANUFACTURE_YEARS = Array.from({ length: CURRENT_YEAR - 1979 }, (_, i) => CURRENT_YEAR - i);

function ExpiryHint({ date }: { date: string }) {
  if (!date) return null;
  const days = daysUntil(date);
  const isExpired = days < 0;
  const isSoon = !isExpired && days <= 30;
  const toneClass = isExpired
    ? 'text-danger-600 dark:text-danger-400'
    : isSoon
      ? 'text-warning-600 dark:text-warning-400'
      : 'text-success-600 dark:text-success-400';
  return (
    <p className={cn('text-xs font-medium', toneClass)}>
      {isExpired
        ? `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`
        : `${isSoon ? 'Expiring soon — ' : ''}${days} day${days === 1 ? '' : 's'} remaining`}
    </p>
  );
}

export function VehicleForm({ customer, initial, submitLabel, onSubmit, onCancel, sidebarExtra }: VehicleFormProps) {
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
    photoUrl: initial?.photoUrl ?? '',
  });
  const [errors, setErrors] = useState<VehicleFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modelSuggestions = MODELS_BY_BRAND[values.brand] ?? [];
  const [forceCustomBrand, setForceCustomBrand] = useState(() => !!(initial?.brand && !VEHICLE_BRANDS.includes(initial.brand)));
  const [forceCustomModel, setForceCustomModel] = useState(
    () => !!(initial?.model && !(MODELS_BY_BRAND[initial.brand ?? '']?.includes(initial.model))),
  );
  const [forceCustomColour, setForceCustomColour] = useState(
    () => !!(initial?.colour && !VEHICLE_COLOURS.some((c) => c.name === initial.colour)),
  );
  const [forceCustomWarranty, setForceCustomWarranty] = useState(
    () => !!(initial?.warrantyInfo && !WARRANTY_PRESETS.includes(initial.warrantyInfo)),
  );

  const [photoPreview, setPhotoPreview] = useState<string | null>(initial?.photoUrl ?? null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleBrandChange(newBrand: string) {
    setForceCustomBrand(false);
    setForceCustomModel(false);
    setValues((v) => ({ ...v, brand: newBrand, model: '' }));
  }

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setPhotoPreview(URL.createObjectURL(file));
    setPhotoError(null);
    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'vehicle-photo');
      const uploaded = await apiPost<{ url: string }>('/uploads', formData);
      set('photoUrl', uploaded.url);
    } catch (err) {
      setPhotoError(err instanceof ApiError ? err.message : 'Could not upload photo.');
      setPhotoPreview(initial?.photoUrl ?? null);
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  function handleRemovePhoto() {
    setPhotoPreview(null);
    set('photoUrl', '');
    setPhotoError(null);
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

  const selectedColourHex = VEHICLE_COLOURS.find((c) => c.name === values.colour)?.hex;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex h-14 items-center justify-between rounded-lg border border-accent-200 bg-accent-50 px-4 dark:border-accent-500/30 dark:bg-accent-500/10">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-500 text-micro font-semibold text-white">
            {initialsFor(customer.name)}
          </span>
          <span className="text-sm text-ink">
            {customer.name} <span className="num text-ink-muted">· {customer.mobile}</span>
          </span>
        </div>
        <span className="rounded-full bg-accent-100 px-2.5 py-1 text-micro font-semibold uppercase tracking-wide text-accent-700 dark:bg-accent-500/20 dark:text-accent-400">
          Owner
        </span>
      </div>

      {formError ? (
        <p role="alert" className="rounded border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400">
          {formError}
        </p>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardBody className="flex flex-col gap-4 pt-5">
              <SectionHeading number={1} title="Vehicle Information" subtitle="Basic details about the vehicle." />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Input
                    label="Registration Number"
                    value={values.registrationNo}
                    onChange={(e) => set('registrationNo', e.target.value.toUpperCase())}
                    placeholder="TN 37 AB 1234"
                    error={errors.registrationNo}
                    required
                  />
                  <p className="text-xs text-ink-muted">Enter vehicle registration number</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Input label="VIN / Chassis Number" value={values.vin} onChange={(e) => set('vin', e.target.value.toUpperCase())} error={errors.vin} />
                  <p className="text-xs text-ink-muted">Unique vehicle identification number</p>
                </div>

                {forceCustomBrand ? (
                  <div className="flex flex-col gap-1.5">
                    <Input label="Brand" value={values.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Enter brand" error={errors.brand} required />
                    <button type="button" onClick={() => { setForceCustomBrand(false); setValues((v) => ({ ...v, brand: '', model: '' })); }} className="self-start text-xs text-accent-600 hover:underline">
                      ← Choose from list
                    </button>
                  </div>
                ) : (
                  <Select
                    label="Brand"
                    value={values.brand}
                    onChange={(e) => (e.target.value === OTHER_VALUE ? (setForceCustomBrand(true), setValues((v) => ({ ...v, brand: '', model: '' }))) : handleBrandChange(e.target.value))}
                    error={errors.brand}
                    required
                  >
                    <option value="">Select brand</option>
                    {VEHICLE_BRANDS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                    <option value={OTHER_VALUE}>Other (type manually)</option>
                  </Select>
                )}

                {forceCustomModel || modelSuggestions.length === 0 ? (
                  <div className="flex flex-col gap-1.5">
                    <Input label="Model" value={values.model} onChange={(e) => set('model', e.target.value)} placeholder="Enter model" error={errors.model} required />
                    {modelSuggestions.length > 0 ? (
                      <button type="button" onClick={() => { setForceCustomModel(false); set('model', ''); }} className="self-start text-xs text-accent-600 hover:underline">
                        ← Choose from list
                      </button>
                    ) : (
                      <p className="text-xs text-ink-muted">Select a brand to see suggested models.</p>
                    )}
                  </div>
                ) : (
                  <Select
                    label="Model"
                    value={modelSuggestions.includes(values.model) ? values.model : ''}
                    onChange={(e) => (e.target.value === OTHER_VALUE ? (setForceCustomModel(true), set('model', '')) : set('model', e.target.value))}
                    error={errors.model}
                    required
                  >
                    <option value="">Select model</option>
                    {modelSuggestions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                    <option value={OTHER_VALUE}>Other (type manually)</option>
                  </Select>
                )}

                <Input label="Variant" value={values.variant} onChange={(e) => set('variant', e.target.value)} error={errors.variant} />

                <Select
                  label="Manufacture Year"
                  value={Number.isNaN(values.manufactureYear) ? '' : String(values.manufactureYear)}
                  onChange={(e) => set('manufactureYear', e.target.value === '' ? NaN : Number(e.target.value))}
                  error={errors.manufactureYear}
                >
                  <option value="">—</option>
                  {MANUFACTURE_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>

                <Select label="Fuel Type" value={values.fuelType} onChange={(e) => set('fuelType', e.target.value as typeof values.fuelType)} error={errors.fuelType}>
                  <option value="">—</option>
                  {FUEL_TYPES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </Select>

                <Select label="Transmission" value={values.transmission} onChange={(e) => set('transmission', e.target.value as typeof values.transmission)} error={errors.transmission}>
                  <option value="">—</option>
                  {TRANSMISSIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>

                {forceCustomColour ? (
                  <div className="flex flex-col gap-1.5">
                    <Input label="Colour" value={values.colour} onChange={(e) => set('colour', e.target.value)} error={errors.colour} />
                    <button type="button" onClick={() => { setForceCustomColour(false); set('colour', ''); }} className="self-start text-xs text-accent-600 hover:underline">
                      ← Choose from list
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    {selectedColourHex ? (
                      <span className="pointer-events-none absolute left-3 top-[34px] h-3 w-3 rounded-full border border-line" style={{ backgroundColor: selectedColourHex }} aria-hidden />
                    ) : null}
                    <Select
                      label="Colour"
                      value={values.colour}
                      onChange={(e) => (e.target.value === OTHER_VALUE ? (setForceCustomColour(true), set('colour', '')) : set('colour', e.target.value))}
                      error={errors.colour}
                      className={selectedColourHex ? 'pl-8' : undefined}
                    >
                      <option value="">Select colour</option>
                      {VEHICLE_COLOURS.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                      <option value={OTHER_VALUE}>Other (type manually)</option>
                    </Select>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <Input
                    label="Current Odometer (km)"
                    type="number"
                    value={Number.isNaN(values.odometerReading) ? '' : values.odometerReading}
                    onChange={(e) => set('odometerReading', e.target.value === '' ? NaN : Number(e.target.value))}
                    error={errors.odometerReading}
                  />
                  <p className="text-xs text-ink-muted">Current reading on the odometer</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex flex-col gap-4 pt-5">
              <SectionHeading number={2} title="Documents & Compliance" subtitle="Insurance, PUC and warranty details." />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Input label="Insurance Expiry" type="date" value={values.insuranceExpiry} onChange={(e) => set('insuranceExpiry', e.target.value)} error={errors.insuranceExpiry} />
                  <ExpiryHint date={values.insuranceExpiry} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Input label="PUC Expiry" type="date" value={values.pucExpiry} onChange={(e) => set('pucExpiry', e.target.value)} error={errors.pucExpiry} />
                  <ExpiryHint date={values.pucExpiry} />
                </div>
                <Input label="Purchase Date" type="date" value={values.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} error={errors.purchaseDate} />

                {forceCustomWarranty ? (
                  <div className="flex flex-col gap-1.5">
                    <Input label="Warranty" value={values.warrantyInfo} onChange={(e) => set('warrantyInfo', e.target.value)} error={errors.warrantyInfo} />
                    <button type="button" onClick={() => { setForceCustomWarranty(false); set('warrantyInfo', ''); }} className="self-start text-xs text-accent-600 hover:underline">
                      ← Choose from list
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <Select
                      label="Warranty"
                      value={values.warrantyInfo}
                      onChange={(e) => (e.target.value === OTHER_VALUE ? (setForceCustomWarranty(true), set('warrantyInfo', '')) : set('warrantyInfo', e.target.value))}
                      error={errors.warrantyInfo}
                    >
                      <option value="">—</option>
                      {WARRANTY_PRESETS.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                      <option value={OTHER_VALUE}>Other (type manually)</option>
                    </Select>
                    <p className="text-xs text-ink-muted">Select warranty type</p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Card>
              <CardBody className="flex flex-col gap-3 pt-5">
                <SectionHeading number={3} title="Vehicle Photo" subtitle="Upload vehicle photo for easy identification." />
                {photoPreview ? (
                  <div className="relative w-fit">
                    {/* eslint-disable-next-line @next/next/no-img-element -- a locally-picked file's blob: URL, or an already-resolved photoUrl on edit; never a raw unresolved storage reference (see CLAUDE.md's upload-display rule) */}
                    <img src={photoPreview} alt="Vehicle" className="h-28 w-40 rounded-lg border border-line object-cover" />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      aria-label="Remove photo"
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-ink-secondary shadow-card hover:text-ink"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="flex h-28 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line text-ink-secondary hover:border-accent-400 hover:text-accent-600 disabled:opacity-60"
                  >
                    <Upload className="h-4 w-4" aria-hidden />
                    <span className="text-xs font-medium">{isUploadingPhoto ? 'Uploading…' : 'Click to upload or drag & drop'}</span>
                    <span className="text-micro text-ink-muted">JPG, PNG up to 5MB</span>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                {photoError ? <span className="text-xs text-danger-600 dark:text-danger-400">{photoError}</span> : null}
              </CardBody>
            </Card>

            <Card>
              <CardBody className="flex flex-col gap-3 pt-5">
                <SectionHeading number={4} title="Notes (Optional)" subtitle="Add any additional information about the vehicle." />
                <div className="flex flex-col gap-1">
                  <Textarea
                    value={values.notes}
                    onChange={(e) => set('notes', e.target.value.slice(0, NOTES_MAX_LENGTH))}
                    error={errors.notes}
                    maxLength={NOTES_MAX_LENGTH}
                    placeholder="Enter notes…"
                    rows={5}
                  />
                  <span className="self-end text-micro text-ink-muted">
                    {values.notes.length} / {NOTES_MAX_LENGTH}
                  </span>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>

        {sidebarExtra ? <div className="flex flex-col gap-6">{sidebarExtra}</div> : null}
      </div>

      <div className="flex justify-end gap-3">
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
