'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { validatePartForm, type PartFormErrors, type PartFormValues } from '@/lib/validation/part';
import type { Part, PartCategory, PaginatedResult, Supplier } from '@/lib/api-types';
import { formatMoney } from '@/lib/format';
import { SectionHeading } from './section-heading';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface PartFormProps {
  initial?: Part;
  submitLabel: string;
  onSubmit: (values: PartFormValues) => Promise<void>;
  onCancel: () => void;
}

export function PartForm({ initial, submitLabel, onSubmit, onCancel }: PartFormProps) {
  const categories = useApiQuery<PartCategory[]>(() => apiGet('/part-categories'), []);
  const suppliers = useApiQuery<PaginatedResult<Supplier>>(() => apiGet('/suppliers?isActive=true&pageSize=100'), []);

  const [values, setValues] = useState({
    partNumber: initial?.partNumber ?? '',
    sku: initial?.sku ?? '',
    name: initial?.name ?? '',
    categoryId: initial?.categoryId ?? '',
    brand: initial?.brand ?? '',
    vehicleCompatibility: initial?.vehicleCompatibility ?? '',
    supplierId: initial?.supplierId ?? '',
    purchasePrice: initial?.purchasePrice ?? '',
    sellingPrice: initial?.sellingPrice ?? '',
    gstRate: initial?.gstRate ?? '18',
    hsnCode: initial?.hsnCode ?? '',
    minStock: initial?.minStock ?? '',
    maxStock: initial?.maxStock ?? '',
    binLocation: initial?.binLocation ?? '',
    warrantyPeriodMonths: initial?.warrantyPeriodMonths ?? '',
    isActive: initial?.isActive ?? true,
  });
  const [errors, setErrors] = useState<PartFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    setIsAddingCategory(true);
    try {
      const category = await apiPost<PartCategory>('/part-categories', { name: newCategoryName.trim() });
      setNewCategoryName('');
      categories.refetch();
      set('categoryId', category.id);
    } catch {
      // Non-fatal — the category select just won't have the new option; the user can retry.
    } finally {
      setIsAddingCategory(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = validatePartForm({
      ...values,
      purchasePrice: Number(values.purchasePrice),
      sellingPrice: Number(values.sellingPrice),
      gstRate: Number(values.gstRate),
      minStock: values.minStock === '' ? NaN : Number(values.minStock),
      maxStock: values.maxStock === '' ? NaN : Number(values.maxStock),
      warrantyPeriodMonths: values.warrantyPeriodMonths === '' ? NaN : Number(values.warrantyPeriodMonths),
    });
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

  const purchasePriceNum = Number(values.purchasePrice) || 0;
  const sellingPriceNum = Number(values.sellingPrice) || 0;
  const gstRateNum = Number(values.gstRate) || 0;

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="flex flex-col gap-4">
          <SectionHeading number={1} title="Basic Information" />
          <Input label="Part Number *" value={values.partNumber} onChange={(e) => set('partNumber', e.target.value)} placeholder="e.g. PN-111-001" error={errors.partNumber} />
          <Input label="SKU *" value={values.sku} onChange={(e) => set('sku', e.target.value)} placeholder="e.g. BRK-DISC-001" error={errors.sku} />
          <Input label="Part Name *" value={values.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Brake Disc Front" error={errors.name} />
          <Input label="Brand" value={values.brand} onChange={(e) => set('brand', e.target.value)} error={errors.brand} />
          <Input
            label="Vehicle Compatibility"
            value={values.vehicleCompatibility}
            onChange={(e) => set('vehicleCompatibility', e.target.value)}
            placeholder="e.g. BMW X5 2018-2023"
            error={errors.vehicleCompatibility}
          />
        </div>

        <div className="flex flex-col gap-4">
          <SectionHeading number={2} title="Category & Supplier" />
          <div className="flex flex-col gap-1.5">
            <Select label="Category" value={values.categoryId} onChange={(e) => set('categoryId', e.target.value)} error={errors.categoryId}>
              <option value="">Select category…</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <div className="flex gap-2">
              <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="New category name" className="h-8 text-xs" />
              <Button type="button" variant="ghost" size="sm" onClick={handleAddCategory} isLoading={isAddingCategory}>
                Add
              </Button>
            </div>
          </div>

          <Select label="Preferred Supplier" value={values.supplierId} onChange={(e) => set('supplierId', e.target.value)} error={errors.supplierId}>
            <option value="">Select supplier (optional)…</option>
            {suppliers.data?.items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={values.isActive} onChange={(e) => set('isActive', e.target.checked)} className="h-4 w-4 rounded border-line accent-accent-500" />
            Active
          </label>
        </div>

        <div className="flex flex-col gap-4">
          <SectionHeading number={3} title="Pricing & Tax" />
          <Input label="Purchase Price (₹) *" type="number" min={0} value={values.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} error={errors.purchasePrice} />
          <Input label="Selling Price (₹) *" type="number" min={0} value={values.sellingPrice} onChange={(e) => set('sellingPrice', e.target.value)} error={errors.sellingPrice} />
          <Select label="GST Rate (%) *" value={values.gstRate} onChange={(e) => set('gstRate', e.target.value)} error={errors.gstRate}>
            {['0', '5', '12', '18', '28'].map((rate) => (
              <option key={rate} value={rate}>
                {rate}%
              </option>
            ))}
          </Select>
          <Input label="HSN Code" value={values.hsnCode} onChange={(e) => set('hsnCode', e.target.value)} placeholder="e.g. 87089900" error={errors.hsnCode} />

          {purchasePriceNum > 0 || sellingPriceNum > 0 ? (
            <div className="rounded border border-line bg-surface-hover px-3 py-2 text-xs">
              <div className="flex justify-between text-ink-secondary">
                <span>Purchase Price</span>
                <span className="num text-ink">{formatMoney(purchasePriceNum)}</span>
              </div>
              <div className="flex justify-between text-ink-secondary">
                <span>GST</span>
                <span className="num text-ink">{gstRateNum}%</span>
              </div>
              <div className="mt-1 flex justify-between border-t border-line pt-1 font-medium text-ink">
                <span>Selling Price</span>
                <span className="num">{formatMoney(sellingPriceNum)}</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <SectionHeading number={4} title="Inventory" />
          {initial ? (
            <div className="flex flex-col gap-1">
              <Input label="Current Stock" value={initial.currentStock} disabled />
              <p className="text-xs text-ink-muted">
                Stock changes should normally be recorded through{' '}
                <Link href={`/parts-inventory/${initial.id}`} className="text-accent-600 hover:underline">
                  Stock Adjustment
                </Link>{' '}
                so the inventory history remains accurate.
              </p>
            </div>
          ) : (
            <Input label="Current Stock" value="0" disabled />
          )}
          <Input label="Minimum Stock *" type="number" min={0} value={values.minStock} onChange={(e) => set('minStock', e.target.value)} error={errors.minStock} />
          <Input label="Maximum Stock" type="number" min={0} value={values.maxStock} onChange={(e) => set('maxStock', e.target.value)} error={errors.maxStock} />
          <Input label="Bin Location" value={values.binLocation} onChange={(e) => set('binLocation', e.target.value)} placeholder="e.g. A-01-03" error={errors.binLocation} />
          <Input
            label="Warranty (months)"
            type="number"
            min={0}
            value={values.warrantyPeriodMonths}
            onChange={(e) => set('warrantyPeriodMonths', e.target.value)}
            error={errors.warrantyPeriodMonths}
          />
        </div>
      </div>

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
