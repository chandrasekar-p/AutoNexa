'use client';

import { useState } from 'react';
import { apiPost, ApiError } from '@/lib/api-client';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { STOCK_ADJUSTMENT_REASONS, type StockAdjustmentReason, type Part } from '@/lib/api-types';

const REASON_LABEL: Record<StockAdjustmentReason, string> = {
  PURCHASE_RECEIVED: 'Purchase Received',
  PART_USED: 'Part Used',
  DAMAGED: 'Damaged',
  RETURNED: 'Returned',
  MANUAL_CORRECTION: 'Manual Correction',
  WARRANTY_REPLACEMENT: 'Warranty Replacement',
  OTHER: 'Other',
};

interface StockAdjustmentModalProps {
  part: Pick<Part, 'id' | 'name' | 'currentStock'>;
  onClose: () => void;
  onAdjusted: () => void;
}

/**
 * The one real gap this module had — POST /parts/:id/stock-adjustment
 * (see PartsService.adjustStock) is a new, real endpoint backed by an
 * InventoryTransaction row, not a client-side-only stock edit. The "New
 * Stock" preview below is computed the same way the backend will, purely
 * for the user's confidence before submitting — the server recomputes and
 * enforces it for real (rejecting a Stock Out that would go negative).
 */
export function StockAdjustmentModal({ part, onClose, onAdjusted }: StockAdjustmentModalProps) {
  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<StockAdjustmentReason | ''>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedQuantity = Number(quantity);
  const isValidQuantity = quantity !== '' && Number.isInteger(parsedQuantity) && parsedQuantity > 0;
  const newStock = isValidQuantity ? part.currentStock + (direction === 'IN' ? parsedQuantity : -parsedQuantity) : null;

  async function handleConfirm() {
    if (!isValidQuantity) {
      setError('Enter a whole number quantity greater than 0.');
      return;
    }
    if (!reason) {
      setError('Select a reason.');
      return;
    }
    if (direction === 'OUT' && newStock !== null && newStock < 0) {
      setError('This would take stock below zero.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await apiPost(`/parts/${part.id}/stock-adjustment`, { direction, quantity: parsedQuantity, reason, notes: notes || undefined });
      onAdjusted();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="Adjust Stock" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <span className="text-xs font-medium text-ink-secondary">Part</span>
          <p className="text-sm font-medium text-ink">{part.name}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-ink-secondary">Current Stock</span>
          <p className="num text-sm text-ink">{part.currentStock}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-secondary">Adjustment Type</span>
          <div className="flex gap-4">
            {(['IN', 'OUT'] as const).map((d) => (
              <label key={d} className="flex items-center gap-1.5 text-sm text-ink">
                <input type="radio" name="adjustment-direction" checked={direction === d} onChange={() => setDirection(d)} className="h-4 w-4 border-line accent-accent-500" />
                {d === 'IN' ? 'Stock In' : 'Stock Out'}
              </label>
            ))}
          </div>
        </div>

        <Input label="Quantity *" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />

        <Select label="Reason *" value={reason} onChange={(e) => setReason(e.target.value as StockAdjustmentReason)}>
          <option value="">Select reason…</option>
          {STOCK_ADJUSTMENT_REASONS.map((r) => (
            <option key={r} value={r}>
              {REASON_LABEL[r]}
            </option>
          ))}
        </Select>

        <Textarea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />

        {newStock !== null ? (
          <div className="rounded border border-line bg-surface-hover px-3 py-2">
            <span className="text-xs font-medium text-ink-secondary">New Stock</span>
            <p className={`num text-lg font-semibold ${newStock < 0 ? 'text-danger-600 dark:text-danger-400' : 'text-ink'}`}>{newStock}</p>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="rounded border border-danger-100 bg-danger-50 px-3 py-2 text-xs text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} isLoading={isSubmitting}>
            Confirm Adjustment
          </Button>
        </div>
      </div>
    </Modal>
  );
}
