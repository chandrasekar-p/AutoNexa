'use client';

import { useState, type FormEvent } from 'react';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { validatePartForm, type PartFormErrors, type PartFormValues } from '@/lib/validation/part';
import type { Part, PartCategory, PaginatedResult, Supplier } from '@/lib/api-types';
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
        <Input label="Part Number" value={values.partNumber} onChange={(e) => set('partNumber', e.target.value)} error={errors.partNumber} required />
        <Input label="SKU" value={values.sku} onChange={(e) => set('sku', e.target.value)} error={errors.sku} required />
        <div className="sm:col-span-2">
          <Input label="Name" value={values.name} onChange={(e) => set('name', e.target.value)} error={errors.name} required />
        </div>
        <Input label="Brand" value={values.brand} onChange={(e) => set('brand', e.target.value)} error={errors.brand} />
        <Input
          label="Vehicle Compatibility"
          value={values.vehicleCompatibility}
          onChange={(e) => set('vehicleCompatibility', e.target.value)}
          placeholder="BMW X5 2018-2023"
          error={errors.vehicleCompatibility}
        />

        <div className="flex flex-col gap-1.5">
          <Select label="Category" value={values.categoryId} onChange={(e) => set('categoryId', e.target.value)} error={errors.categoryId}>
            <option value="">—</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name"
              className="h-8 text-xs"
            />
            <Button type="button" variant="ghost" size="sm" onClick={handleAddCategory} isLoading={isAddingCategory}>
              Add
            </Button>
          </div>
        </div>

        <Select label="Preferred Supplier" value={values.supplierId} onChange={(e) => set('supplierId', e.target.value)} error={errors.supplierId}>
          <option value="">—</option>
          {suppliers.data?.items.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>

        <Input
          label="Purchase Price"
          type="number"
          value={values.purchasePrice}
          onChange={(e) => set('purchasePrice', e.target.value)}
          error={errors.purchasePrice}
          required
        />
        <Input
          label="Selling Price"
          type="number"
          value={values.sellingPrice}
          onChange={(e) => set('sellingPrice', e.target.value)}
          error={errors.sellingPrice}
          required
        />
        <Input label="GST Rate (%)" type="number" value={values.gstRate} onChange={(e) => set('gstRate', e.target.value)} error={errors.gstRate} />
        <Input label="HSN Code" value={values.hsnCode} onChange={(e) => set('hsnCode', e.target.value)} error={errors.hsnCode} />
        <Input label="Minimum Stock" type="number" value={values.minStock} onChange={(e) => set('minStock', e.target.value)} error={errors.minStock} />
        <Input label="Maximum Stock" type="number" value={values.maxStock} onChange={(e) => set('maxStock', e.target.value)} error={errors.maxStock} />
        <Input label="Bin Location" value={values.binLocation} onChange={(e) => set('binLocation', e.target.value)} error={errors.binLocation} />
        <Input
          label="Warranty (months)"
          type="number"
          value={values.warrantyPeriodMonths}
          onChange={(e) => set('warrantyPeriodMonths', e.target.value)}
          error={errors.warrantyPeriodMonths}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={values.isActive} onChange={(e) => set('isActive', e.target.checked)} className="h-4 w-4 rounded border-line" />
        Active
      </label>

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
