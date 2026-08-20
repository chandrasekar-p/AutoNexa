'use client';

import { useState } from 'react';
import { apiPatch, apiPost, ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import type { InspectionCategory, InspectionItem, InspectionResult } from '@/lib/api-types';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const CATEGORY_LABEL: Record<InspectionCategory, string> = {
  EXTERIOR: 'Exterior',
  INTERIOR: 'Interior',
  MECHANICAL: 'Mechanical',
};
const RESULT_LABEL: Record<InspectionResult, string> = {
  NOT_CHECKED: 'Not Checked',
  PASS: 'Pass',
  NEEDS_ATTENTION: 'Needs Attention',
  FAIL: 'Fail / Critical',
};
const RESULT_BORDER: Record<InspectionResult, string> = {
  NOT_CHECKED: 'border-line',
  PASS: 'border-success-500',
  NEEDS_ATTENTION: 'border-warning-500',
  FAIL: 'border-danger-500',
};

function ItemRow({
  inspectionId,
  item,
  readOnly,
  onUpdated,
}: {
  inspectionId: string;
  item: InspectionItem;
  readOnly: boolean;
  onUpdated: () => void;
}) {
  const [remarks, setRemarks] = useState(item.remarks ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(patch: Partial<Pick<InspectionItem, 'result' | 'remarks'>>) {
    setIsSaving(true);
    setError(null);
    try {
      await apiPatch(`/inspections/${inspectionId}/items/${item.id}`, patch);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:gap-3">
      <span className="flex-1 text-sm text-ink">{item.itemName}</span>
      <Select
        value={item.result}
        onChange={(e) => save({ result: e.target.value as InspectionResult })}
        disabled={readOnly || isSaving}
        className={cn('h-9 w-full sm:w-44', RESULT_BORDER[item.result])}
      >
        {(Object.keys(RESULT_LABEL) as InspectionResult[]).map((r) => (
          <option key={r} value={r}>
            {RESULT_LABEL[r]}
          </option>
        ))}
      </Select>
      <Input
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        onBlur={() => remarks !== (item.remarks ?? '') && save({ remarks })}
        placeholder="Remarks"
        disabled={readOnly || isSaving}
        className="h-9 w-full sm:w-56"
      />
      {error ? <span className="text-xs text-danger-600 dark:text-danger-400">{error}</span> : null}
    </div>
  );
}

function AddItemForm({ inspectionId, onAdded }: { inspectionId: string; onAdded: () => void }) {
  const [category, setCategory] = useState<InspectionCategory>('EXTERIOR');
  const [itemName, setItemName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!itemName.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      await apiPost(`/inspections/${inspectionId}/items`, { category, itemName: itemName.trim() });
      setItemName('');
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add item.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:items-center">
      <Select value={category} onChange={(e) => setCategory(e.target.value as InspectionCategory)} className="h-9 sm:w-40">
        {(Object.keys(CATEGORY_LABEL) as InspectionCategory[]).map((c) => (
          <option key={c} value={c}>
            {CATEGORY_LABEL[c]}
          </option>
        ))}
      </Select>
      <Input
        value={itemName}
        onChange={(e) => setItemName(e.target.value)}
        placeholder="Add a checklist item…"
        className="h-9 flex-1"
      />
      <Button type="button" variant="secondary" size="sm" onClick={handleAdd} isLoading={isSaving}>
        Add
      </Button>
      {error ? <span className="text-xs text-danger-600 dark:text-danger-400">{error}</span> : null}
    </div>
  );
}

interface InspectionChecklistProps {
  inspectionId: string;
  items: InspectionItem[];
  readOnly: boolean;
  onUpdated: () => void;
}

/** Grouped Exterior/Interior/Mechanical checklist (SRS §9) — each item's result/remarks save individually via PATCH /inspections/:id/items/:itemId, no separate "save" step for the whole form. */
export function InspectionChecklist({ inspectionId, items, readOnly, onUpdated }: InspectionChecklistProps) {
  const categories: InspectionCategory[] = ['EXTERIOR', 'INTERIOR', 'MECHANICAL'];

  return (
    <div className="flex flex-col gap-6">
      {categories.map((category) => {
        const categoryItems = items.filter((i) => i.category === category);
        if (categoryItems.length === 0) return null;
        return (
          <div key={category}>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
              {CATEGORY_LABEL[category]}
            </h3>
            <div className="flex flex-col divide-y divide-line">
              {categoryItems.map((item) => (
                <ItemRow key={item.id} inspectionId={inspectionId} item={item} readOnly={readOnly} onUpdated={onUpdated} />
              ))}
            </div>
          </div>
        );
      })}
      {!readOnly ? <AddItemForm inspectionId={inspectionId} onAdded={onUpdated} /> : null}
    </div>
  );
}
