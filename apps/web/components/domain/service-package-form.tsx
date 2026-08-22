'use client';

import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { apiGet, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import {
  validateServicePackageForm,
  type ServicePackageFormErrors,
  type ServicePackageFormValues,
} from '@/lib/validation/service-package';
import type { LabourItemRef, PartCategory, PartRef, ServicePackage } from '@/lib/api-types';
import { LabourItemPicker } from '@/components/domain/labour-item-picker';
import { PartPicker } from '@/components/domain/part-picker';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface ServicePackageFormProps {
  initial?: ServicePackage;
  submitLabel: string;
  onSubmit: (values: ServicePackageFormValues) => Promise<void>;
  onCancel: () => void;
}

/** Refs keyed by id so the add-picker can dedupe and the chip-list can render a label — labour items and parts each carry a different shape, so this stays generic over just what's needed for both. */
interface RefChip {
  id: string;
  label: string;
}

function ChipList({ items, onRemove, emptyLabel }: { items: RefChip[]; onRemove: (id: string) => void; emptyLabel: string }) {
  if (items.length === 0) return <p className="text-xs text-ink-muted">{emptyLabel}</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between rounded border border-line bg-surface-hover px-3 py-1.5 text-sm">
          <span className="text-ink">{item.label}</span>
          <button type="button" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.label}`} className="text-ink-muted hover:text-danger-600">
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function ServicePackageForm({ initial, submitLabel, onSubmit, onCancel }: ServicePackageFormProps) {
  const [values, setValues] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    price: initial?.price ?? '',
    gstRate: initial?.gstRate ?? '',
    validityMonths: initial ? String(initial.validityMonths) : '',
    visitLimit: initial?.visitLimit != null ? String(initial.visitLimit) : '',
    isActive: initial?.isActive ?? true,
  });
  const [labourItems, setLabourItems] = useState<RefChip[]>(
    (initial?.includedLabourItems ?? []).map((r) => ({ id: r.labourItem.id, label: `${r.labourItem.code} — ${r.labourItem.description}` })),
  );
  const [parts, setParts] = useState<RefChip[]>(
    (initial?.includedParts ?? []).map((r) => ({ id: r.part.id, label: `${r.part.partNumber} — ${r.part.name}` })),
  );
  const [partCategoryIds, setPartCategoryIds] = useState<Set<string>>(
    new Set((initial?.includedPartCategories ?? []).map((r) => r.partCategory.id)),
  );
  const [pickedLabourItem, setPickedLabourItem] = useState<LabourItemRef | null>(null);
  const [pickedPart, setPickedPart] = useState<PartRef | null>(null);

  const [errors, setErrors] = useState<ServicePackageFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = useApiQuery<PartCategory[]>(() => apiGet('/part-categories'), []);

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function addLabourItem(item: LabourItemRef | null) {
    if (!item || labourItems.some((l) => l.id === item.id)) return;
    setLabourItems((prev) => [...prev, { id: item.id, label: `${item.code} — ${item.description}` }]);
  }

  function addPart(part: PartRef | null) {
    if (!part || parts.some((p) => p.id === part.id)) return;
    setParts((prev) => [...prev, { id: part.id, label: `${part.partNumber} — ${part.name}` }]);
  }

  function toggleCategory(id: string) {
    setPartCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = validateServicePackageForm({
      ...values,
      labourItemIds: labourItems.map((l) => l.id),
      partIds: parts.map((p) => p.id),
      partCategoryIds: [...partCategoryIds],
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
        <div className="sm:col-span-2">
          <Input label="Name" value={values.name} onChange={(e) => set('name', e.target.value)} error={errors.name} required />
        </div>
        <Input label="Price" type="number" value={values.price} onChange={(e) => set('price', e.target.value)} error={errors.price} required />
        <Input label="GST Rate (%)" type="number" value={values.gstRate} onChange={(e) => set('gstRate', e.target.value)} error={errors.gstRate} required />
        <Input
          label="Validity (months)"
          type="number"
          value={values.validityMonths}
          onChange={(e) => set('validityMonths', e.target.value)}
          error={errors.validityMonths}
          required
        />
        <Input
          label="Visit Limit"
          type="number"
          value={values.visitLimit}
          onChange={(e) => set('visitLimit', e.target.value)}
          placeholder="Unlimited"
          error={errors.visitLimit}
        />
      </div>

      <Textarea label="Description" value={values.description} onChange={(e) => set('description', e.target.value)} error={errors.description} />

      <label className="flex items-center gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(e) => set('isActive', e.target.checked)}
          className="h-4 w-4 rounded border-line accent-accent-500"
        />
        Offered to customers (visible when selling a new package)
      </label>

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <span className="text-xs font-medium text-ink-secondary">Included Labour (free when redeemed)</span>
        <ChipList items={labourItems} onRemove={(id) => setLabourItems((prev) => prev.filter((l) => l.id !== id))} emptyLabel="No labour items included." />
        <LabourItemPicker value={null} onChange={addLabourItem} />
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <span className="text-xs font-medium text-ink-secondary">Included Parts (free when redeemed)</span>
        <ChipList items={parts} onRemove={(id) => setParts((prev) => prev.filter((p) => p.id !== id))} emptyLabel="No parts included." />
        <PartPicker value={null} onChange={addPart} />
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <span className="text-xs font-medium text-ink-secondary">Included Part Categories (any part in these categories, free when redeemed)</span>
        {categories.data && categories.data.length > 0 ? (
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {categories.data.map((category) => (
              <label key={category.id} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={partCategoryIds.has(category.id)}
                  onChange={() => toggleCategory(category.id)}
                  className="h-4 w-4 rounded border-line accent-accent-500"
                />
                {category.name}
              </label>
            ))}
          </div>
        ) : (
          <p className="text-xs text-ink-muted">No part categories on file yet.</p>
        )}
      </div>

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
