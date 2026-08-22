'use client';

import { useState } from 'react';
import { apiDelete, apiGet, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { formatMoney } from '@/lib/format';
import { warrantyClaimOriginalLabel } from '@/lib/warranty-claim-label';
import type { JobCardLabourLine, LabourItemRef, PaginatedResult, WarrantyClaim } from '@/lib/api-types';
import { LabourItemPicker } from '@/components/domain/labour-item-picker';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

interface JobCardLabourLinesProps {
  jobCardId: string;
  vehicleId: string;
  lines: JobCardLabourLine[];
  readOnly: boolean;
  onUpdated: () => void;
}

/** Add/remove only — no update endpoint exists for a line once added (see JobCardsController), so there's no inline edit here, unlike EstimateLineItems. */
export function JobCardLabourLines({ jobCardId, vehicleId, lines, readOnly, onUpdated }: JobCardLabourLinesProps) {
  const [picked, setPicked] = useState<LabourItemRef | null>(null);
  const [hours, setHours] = useState('');
  const [warrantyClaimId, setWarrantyClaimId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetched by vehicle (the DTO has no claimJobCardId filter) and narrowed
  // client-side — an open claim is always a handful of rows per vehicle,
  // so this is cheap even though it's not filtered server-side to just
  // this job card.
  const openClaims = useApiQuery<PaginatedResult<WarrantyClaim>>(
    () => (readOnly ? Promise.resolve({ items: [], total: 0, page: 1, pageSize: 50, totalPages: 0 }) : apiGet(`/warranty-claims?vehicleId=${vehicleId}&status=OPEN&pageSize=50`)),
    [vehicleId, readOnly],
  );
  const claimsOnThisJobCard = (openClaims.data?.items ?? []).filter((c) => c.claimJobCardId === jobCardId);

  const total = lines.reduce((sum, l) => sum + Number(l.lineTotal), 0);

  async function handleAdd() {
    if (!picked) return;
    setIsSaving(true);
    setError(null);
    try {
      await apiPost(`/job-cards/${jobCardId}/labour`, {
        labourItemId: picked.id,
        hours: hours ? Number(hours) : undefined,
        warrantyClaimId: warrantyClaimId || undefined,
      });
      setPicked(null);
      setHours('');
      setWarrantyClaimId('');
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
              <TableHeaderCell>Warranty</TableHeaderCell>
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
                <TableCell>
                  {line.warrantyMonths ? <span className="text-ink-secondary">{line.warrantyMonths} mo</span> : <span className="text-ink-muted">—</span>}
                  {line.warrantyClaimId ? (
                    <Badge tone="accent" className="ml-1.5">
                      Claim fix
                    </Badge>
                  ) : null}
                </TableCell>
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
          {claimsOnThisJobCard.length > 0 ? (
            <Select value={warrantyClaimId} onChange={(e) => setWarrantyClaimId(e.target.value)} className="h-9 w-48" aria-label="Resolves warranty claim">
              <option value="">Not a warranty fix</option>
              {claimsOnThisJobCard.map((claim) => (
                <option key={claim.id} value={claim.id}>
                  Resolves: {warrantyClaimOriginalLabel(claim)}
                </option>
              ))}
            </Select>
          ) : null}
          <Button type="button" variant="secondary" size="sm" onClick={handleAdd} isLoading={isSaving} disabled={!picked}>
            Add
          </Button>
        </div>
      ) : null}
    </div>
  );
}
