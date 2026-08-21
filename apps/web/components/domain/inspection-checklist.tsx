'use client';

import { useState } from 'react';
import { apiDelete, apiPatch, apiPost, ApiError } from '@/lib/api-client';
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
// Cool hues (blue/violet/teal) deliberately, so a category tag never reads
// as a result status — those already own green/amber/red on every row's
// Select border (see RESULT_BORDER above).
const CATEGORY_STYLE: Record<InspectionCategory, { badge: string; tabText: string; tabBg: string }> = {
  EXTERIOR: {
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
    tabText: 'text-blue-700 dark:text-blue-400',
    tabBg: 'bg-blue-50 dark:bg-blue-500/10',
  },
  INTERIOR: {
    badge: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
    tabText: 'text-violet-700 dark:text-violet-400',
    tabBg: 'bg-violet-50 dark:bg-violet-500/10',
  },
  MECHANICAL: {
    badge: 'bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400',
    tabText: 'text-teal-700 dark:text-teal-400',
    tabBg: 'bg-teal-50 dark:bg-teal-500/10',
  },
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

  async function handleRemove() {
    if (!window.confirm(`Remove "${item.itemName}" from this checklist?`)) return;
    setIsSaving(true);
    setError(null);
    try {
      await apiDelete(`/inspections/${inspectionId}/items/${item.id}`);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove.');
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
        // Not `|| isSaving` — disabling the select the instant its own
        // onChange fires disables it while it still has focus, and Chrome
        // responds to a focused control becoming disabled by yanking focus
        // away and scrolling the page to the new focus target (often the
        // very top of the document). isSaving still blocks double-submits
        // via save()'s own state, just not through the disabled attribute.
        disabled={readOnly}
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
        disabled={readOnly}
        className="h-9 w-full sm:w-56"
      />
      {!readOnly ? (
        <button
          type="button"
          onClick={handleRemove}
          disabled={isSaving}
          className="shrink-0 text-xs text-danger-600 hover:underline disabled:opacity-60 dark:text-danger-400"
        >
          Remove
        </button>
      ) : null}
      {error ? <span className="text-xs text-danger-600 dark:text-danger-400">{error}</span> : null}
    </div>
  );
}

function AddItemForm({
  inspectionId,
  defaultCategory,
  onAdded,
}: {
  inspectionId: string;
  defaultCategory: InspectionCategory;
  onAdded: () => void;
}) {
  const [category, setCategory] = useState<InspectionCategory>(defaultCategory);
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
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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

const CATEGORIES: InspectionCategory[] = ['EXTERIOR', 'INTERIOR', 'MECHANICAL'];

/**
 * One category visible at a time behind a tab bar, not all three stacked
 * — a full Exterior/Interior/Mechanical checklist run long enough to make
 * stacking them a genuinely long scroll (each category has 6+ rows), and
 * tabs solve that at every screen width, unlike a side-by-side column
 * layout (which would force each row's name/dropdown/remarks to wrap
 * inside a narrowed column, and gains nothing on mobile where columns
 * just collapse back to stacked anyway).
 */
function CategoryTabs({
  active,
  onChange,
  counts,
}: {
  active: InspectionCategory;
  onChange: (category: InspectionCategory) => void;
  counts: Record<InspectionCategory, number>;
}) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-line">
      {CATEGORIES.map((category) => {
        const isActive = category === active;
        return (
          <button
            key={category}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(category)}
            className={cn(
              '-mb-px flex items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? cn('border-current', CATEGORY_STYLE[category].tabText, CATEGORY_STYLE[category].tabBg)
                : 'border-transparent text-ink-secondary hover:bg-surface-hover hover:text-ink',
            )}
          >
            {CATEGORY_LABEL[category]}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-micro font-semibold',
                isActive ? CATEGORY_STYLE[category].badge : 'bg-surface-hover text-ink-muted',
              )}
            >
              {counts[category]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Grouped Exterior/Interior/Mechanical checklist (SRS §9) — each item's result/remarks save individually via PATCH /inspections/:id/items/:itemId, no separate "save" step for the whole form. */
export function InspectionChecklist({ inspectionId, items, readOnly, onUpdated }: InspectionChecklistProps) {
  const [activeCategory, setActiveCategory] = useState<InspectionCategory>('EXTERIOR');
  const counts = Object.fromEntries(
    CATEGORIES.map((c) => [c, items.filter((i) => i.category === c).length]),
  ) as Record<InspectionCategory, number>;
  const activeItems = items.filter((i) => i.category === activeCategory);

  return (
    <div className="flex flex-col gap-4">
      <CategoryTabs active={activeCategory} onChange={setActiveCategory} counts={counts} />

      {activeItems.length === 0 ? (
        <p className="py-4 text-sm text-ink-muted">No {CATEGORY_LABEL[activeCategory].toLowerCase()} items yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-line">
          {activeItems.map((item) => (
            <ItemRow key={item.id} inspectionId={inspectionId} item={item} readOnly={readOnly} onUpdated={onUpdated} />
          ))}
        </div>
      )}

      {!readOnly ? (
        // Sticky so it stays reachable at the bottom of the viewport while
        // scrolling a long checklist, instead of only appearing once
        // scrolled all the way past every item — and tinted so it reads
        // as a persistent action bar rather than blending into the plain
        // checklist rows above it.
        <div className="sticky bottom-0 -mx-5 -mb-5 rounded-b-lg border-t border-accent-200 bg-accent-50 px-5 py-3 dark:border-accent-500/30 dark:bg-accent-500/10">
          <AddItemForm key={activeCategory} inspectionId={inspectionId} defaultCategory={activeCategory} onAdded={onUpdated} />
        </div>
      ) : null}
    </div>
  );
}
