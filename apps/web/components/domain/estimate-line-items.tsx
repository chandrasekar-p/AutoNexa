'use client';

import { useState } from 'react';
import { apiDelete, apiPatch, apiPost, ApiError } from '@/lib/api-client';
import {
  validateEstimateLineItemForm,
  type EstimateLineItemFormErrors,
  type EstimateLineItemFormValues,
} from '@/lib/validation/estimate-line-item';
import { formatMoney } from '@/lib/format';
import type { EstimateLineItem, EstimateLineItemType } from '@/lib/api-types';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const TYPE_LABEL: Record<EstimateLineItemType, string> = { LABOUR: 'Labour', PART: 'Part', CONSUMABLE: 'Consumable' };

function emptyForm(): EstimateLineItemFormValues {
  return { itemType: 'PART', description: '', quantity: 1, unitPrice: 0, gstRate: 18 };
}

function LineItemFormFields({
  values,
  errors,
  onChange,
}: {
  values: EstimateLineItemFormValues;
  errors: EstimateLineItemFormErrors;
  onChange: (values: EstimateLineItemFormValues) => void;
}) {
  return (
    <>
      <Select
        value={values.itemType}
        onChange={(e) => onChange({ ...values, itemType: e.target.value as EstimateLineItemType })}
        className="h-9 w-32"
      >
        {(Object.keys(TYPE_LABEL) as EstimateLineItemType[]).map((t) => (
          <option key={t} value={t}>
            {TYPE_LABEL[t]}
          </option>
        ))}
      </Select>
      <Input
        value={values.description}
        onChange={(e) => onChange({ ...values, description: e.target.value })}
        placeholder="Description"
        error={errors.description}
        className="h-9 flex-1"
      />
      <Input
        type="number"
        value={values.quantity}
        onChange={(e) => onChange({ ...values, quantity: Number(e.target.value) })}
        error={errors.quantity}
        className="h-9 w-20"
        aria-label="Quantity"
      />
      <Input
        type="number"
        value={values.unitPrice}
        onChange={(e) => onChange({ ...values, unitPrice: Number(e.target.value) })}
        error={errors.unitPrice}
        className="h-9 w-28"
        aria-label="Unit price"
      />
      <Input
        type="number"
        value={values.gstRate}
        onChange={(e) => onChange({ ...values, gstRate: Number(e.target.value) })}
        error={errors.gstRate}
        className="h-9 w-20"
        aria-label="GST %"
      />
    </>
  );
}

interface EstimateLineItemsProps {
  estimateId: string;
  lineItems: EstimateLineItem[];
  readOnly: boolean;
  onUpdated: () => void;
}

export function EstimateLineItems({ estimateId, lineItems, readOnly, onUpdated }: EstimateLineItemsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EstimateLineItemFormValues>(emptyForm());
  const [editErrors, setEditErrors] = useState<EstimateLineItemFormErrors>({});
  const [newValues, setNewValues] = useState<EstimateLineItemFormValues>(emptyForm());
  const [newErrors, setNewErrors] = useState<EstimateLineItemFormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function startEdit(item: EstimateLineItem) {
    setEditingId(item.id);
    setEditValues({
      itemType: item.itemType,
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      gstRate: Number(item.gstRate),
    });
    setEditErrors({});
  }

  async function handleSaveEdit(itemId: string) {
    const result = validateEstimateLineItemForm(editValues);
    if (!result.success) {
      setEditErrors(result.errors);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await apiPatch(`/estimates/${estimateId}/line-items/${itemId}`, result.data);
      setEditingId(null);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove(itemId: string) {
    if (!window.confirm('Remove this line item?')) return;
    setIsSaving(true);
    setError(null);
    try {
      await apiDelete(`/estimates/${estimateId}/line-items/${itemId}`);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAdd() {
    const result = validateEstimateLineItemForm(newValues);
    if (!result.success) {
      setNewErrors(result.errors);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await apiPost(`/estimates/${estimateId}/line-items`, result.data);
      setNewValues(emptyForm());
      setNewErrors({});
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add line item.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {lineItems.length === 0 ? (
        <p className="text-sm text-ink-muted">No line items yet.</p>
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Description</TableHeaderCell>
              <TableHeaderCell>Qty</TableHeaderCell>
              <TableHeaderCell>Unit Price</TableHeaderCell>
              <TableHeaderCell>GST %</TableHeaderCell>
              <TableHeaderCell>Line Total</TableHeaderCell>
              {!readOnly ? <TableHeaderCell className="w-24" /> : null}
            </tr>
          </TableHead>
          <TableBody>
            {lineItems.map((item) =>
              editingId === item.id ? (
                <TableRow key={item.id}>
                  <TableCell colSpan={readOnly ? 6 : 7}>
                    <div className="flex flex-wrap items-center gap-2 py-1">
                      <LineItemFormFields values={editValues} errors={editErrors} onChange={setEditValues} />
                      <Button type="button" size="sm" onClick={() => handleSaveEdit(item.id)} isLoading={isSaving}>
                        Save
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={item.id}>
                  <TableCell className="text-ink-secondary">{TYPE_LABEL[item.itemType]}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="num">{item.quantity}</TableCell>
                  <TableCell className="num">{formatMoney(item.unitPrice)}</TableCell>
                  <TableCell className="num">{item.gstRate}%</TableCell>
                  <TableCell className="num font-medium">{formatMoney(item.lineTotal)}</TableCell>
                  {!readOnly ? (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => startEdit(item)} className="text-xs text-accent-600 hover:underline">
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(item.id)}
                          className="text-xs text-danger-600 hover:underline dark:text-danger-400"
                        >
                          Remove
                        </button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      )}

      {error ? <p className="text-xs text-danger-600 dark:text-danger-400">{error}</p> : null}

      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <LineItemFormFields values={newValues} errors={newErrors} onChange={setNewValues} />
          <Button type="button" variant="secondary" size="sm" onClick={handleAdd} isLoading={isSaving}>
            Add Line
          </Button>
        </div>
      ) : null}
    </div>
  );
}
