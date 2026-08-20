'use client';

import { useState } from 'react';
import { apiDelete, apiPost, ApiError } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';
import type { JobCardLabourLine, LabourItemRef } from '@/lib/api-types';
import { LabourItemPicker } from '@/components/domain/labour-item-picker';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

interface JobCardLabourLinesProps {
  jobCardId: string;
  lines: JobCardLabourLine[];
  readOnly: boolean;
  onUpdated: () => void;
}

/** Add/remove only — no update endpoint exists for a line once added (see JobCardsController), so there's no inline edit here, unlike EstimateLineItems. */
export function JobCardLabourLines({ jobCardId, lines, readOnly, onUpdated }: JobCardLabourLinesProps) {
  const [picked, setPicked] = useState<LabourItemRef | null>(null);
  const [hours, setHours] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = lines.reduce((sum, l) => sum + Number(l.lineTotal), 0);

  async function handleAdd() {
    if (!picked) return;
    setIsSaving(true);
    setError(null);
    try {
      await apiPost(`/job-cards/${jobCardId}/labour`, {
        labourItemId: picked.id,
        hours: hours ? Number(hours) : undefined,
      });
      setPicked(null);
      setHours('');
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add labour line.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove(lineId: string) {
    if (!window.confirm('Remove this labour line?')) return;
    setIsSaving(true);
    setError(null);
    try {
      await apiDelete(`/job-cards/${jobCardId}/labour/${lineId}`);
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
        <p className="text-sm text-ink-muted">No labour lines yet.</p>
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Description</TableHeaderCell>
              <TableHeaderCell>Hours</TableHeaderCell>
              <TableHeaderCell>Rate</TableHeaderCell>
              <TableHeaderCell>Line Total</TableHeaderCell>
              {!readOnly ? <TableHeaderCell className="w-16" /> : null}
            </tr>
          </TableHead>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>{line.description ?? '—'}</TableCell>
                <TableCell className="num">{line.hours}</TableCell>
                <TableCell className="num">{formatMoney(line.rate)}</TableCell>
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

      <p className="num text-right text-sm font-medium text-ink">Labour subtotal: {formatMoney(total)}</p>

      {error ? <p className="text-xs text-danger-600 dark:text-danger-400">{error}</p> : null}

      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <LabourItemPicker value={picked} onChange={setPicked} />
          <Input
            type="number"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="Hours (optional)"
            className="h-9 w-40"
          />
          <Button type="button" variant="secondary" size="sm" onClick={handleAdd} isLoading={isSaving} disabled={!picked}>
            Add
          </Button>
        </div>
      ) : null}
    </div>
  );
}
