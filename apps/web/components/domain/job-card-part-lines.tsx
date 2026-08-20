'use client';

import { useState } from 'react';
import { apiDelete, apiPost, ApiError } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';
import type { JobCardPartLine, PartRef } from '@/lib/api-types';
import { PartPicker } from '@/components/domain/part-picker';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

interface JobCardPartLinesProps {
  jobCardId: string;
  lines: JobCardPartLine[];
  readOnly: boolean;
  onUpdated: () => void;
}

/**
 * Add/remove only, same as JobCardLabourLines. Stock actually moves here —
 * adding deducts currentStock at the moment the part is added (not
 * deferred to invoicing), removing restores it — see the backend's
 * addPart/removePart and the note on the JobCardPart schema model.
 */
export function JobCardPartLines({ jobCardId, lines, readOnly, onUpdated }: JobCardPartLinesProps) {
  const [picked, setPicked] = useState<PartRef | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = lines.reduce((sum, l) => sum + Number(l.lineTotal), 0);

  async function handleAdd() {
    if (!picked) return;
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      setError('Quantity must be a whole number of at least 1.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await apiPost(`/job-cards/${jobCardId}/parts`, { partId: picked.id, quantity: qty });
      setPicked(null);
      setQuantity('1');
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add part — check available stock.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove(lineId: string) {
    if (!window.confirm('Remove this part line? Its stock will be restored.')) return;
    setIsSaving(true);
    setError(null);
    try {
      await apiDelete(`/job-cards/${jobCardId}/parts/${lineId}`);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove line.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {lines.length === 0 ? (
        <p className="text-sm text-ink-muted">No parts used yet.</p>
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Qty</TableHeaderCell>
              <TableHeaderCell>Unit Price</TableHeaderCell>
              <TableHeaderCell>Line Total</TableHeaderCell>
              {!readOnly ? <TableHeaderCell className="w-16" /> : null}
            </tr>
          </TableHead>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell className="num">{line.quantity}</TableCell>
                <TableCell className="num">{formatMoney(line.unitPrice)}</TableCell>
                <TableCell className="num font-medium">{formatMoney(line.lineTotal)}</TableCell>
                {!readOnly ? (
                  <TableCell className="text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(line.id)}
                      className="text-xs text-danger-600 hover:underline dark:text-danger-400"
                    >
                      Remove
                    </button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <p className="num text-right text-sm font-medium text-ink">Parts subtotal: {formatMoney(total)}</p>

      {error ? <p className="text-xs text-danger-600 dark:text-danger-400">{error}</p> : null}

      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <PartPicker value={picked} onChange={setPicked} />
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="h-9 w-24"
            aria-label="Quantity"
          />
          <Button type="button" variant="secondary" size="sm" onClick={handleAdd} isLoading={isSaving} disabled={!picked}>
            Add
          </Button>
        </div>
      ) : null}
    </div>
  );
}
