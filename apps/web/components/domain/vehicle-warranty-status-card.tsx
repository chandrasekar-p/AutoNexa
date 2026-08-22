'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { formatDate } from '@/lib/format';
import type { JobCardListItem, PaginatedResult, VehicleWarrantyLabourLine, VehicleWarrantyPartLine, VehicleWarrantyStatus } from '@/lib/api-types';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

type Target = { type: 'labour'; line: VehicleWarrantyLabourLine } | { type: 'part'; line: VehicleWarrantyPartLine };

interface VehicleWarrantyStatusCardProps {
  vehicleId: string;
  canRaiseClaim: boolean;
}

export function VehicleWarrantyStatusCard({ vehicleId, canRaiseClaim }: VehicleWarrantyStatusCardProps) {
  const query = useApiQuery<VehicleWarrantyStatus>(() => apiGet(`/vehicles/${vehicleId}/warranty-status`), [vehicleId]);
  // Only fetched once staff actually opens the raise-claim picker — no
  // point loading every job card for this vehicle on every page view.
  const [target, setTarget] = useState<Target | null>(null);
  const jobCards = useApiQuery<PaginatedResult<JobCardListItem>>(
    () => (target ? apiGet(`/job-cards?vehicleId=${vehicleId}&pageSize=50`) : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 50, totalPages: 0 })),
    [vehicleId, target !== null],
  );
  const [claimJobCardId, setClaimJobCardId] = useState('');
  const [isRaising, setIsRaising] = useState(false);
  const [raiseError, setRaiseError] = useState<string | null>(null);

  // A line with no warranty term at all (the vast majority historically,
  // since HSN/warranty backfill is ongoing) contributes nothing here —
  // every line would otherwise show as a meaningless "Expired, no term".
  const labourLines = (query.data?.labour ?? []).filter((l) => l.warrantyMonths !== null);
  const partLines = (query.data?.parts ?? []).filter((p) => p.warrantyMonths !== null || p.warrantyKm !== null);

  function startRaise(next: Target) {
    setTarget(next);
    setClaimJobCardId('');
    setRaiseError(null);
  }

  async function handleRaise() {
    if (!target || !claimJobCardId) return;
    setIsRaising(true);
    setRaiseError(null);
    try {
      await apiPost('/warranty-claims', {
        claimJobCardId,
        ...(target.type === 'labour' ? { originalJobCardLabourId: target.line.jobCardLabourId } : { originalJobCardPartId: target.line.jobCardPartId }),
      });
      setTarget(null);
      setClaimJobCardId('');
      query.refetch();
    } catch (err) {
      setRaiseError(err instanceof ApiError ? err.message : 'Could not raise a claim for this line.');
    } finally {
      setIsRaising(false);
    }
  }

  function RaiseClaimRow({ current }: { current: Target }) {
    const originJobCardId = current.type === 'labour' ? current.line.jobCardId : current.line.jobCardId;
    const options = jobCards.data?.items.filter((jc) => jc.id !== originJobCardId) ?? [];

    return (
      <div className="flex flex-wrap items-center gap-2 rounded border border-line bg-surface-hover px-3 py-2">
        <span className="text-xs text-ink-secondary">Raise on job card:</span>
        <Select value={claimJobCardId} onChange={(e) => setClaimJobCardId(e.target.value)} className="h-8 w-48" aria-label="Claim job card">
          <option value="">Select…</option>
          {options.map((jc) => (
            <option key={jc.id} value={jc.id}>
              {jc.jobCardNumber} ({jc.status})
            </option>
          ))}
        </Select>
        <Button type="button" size="sm" onClick={handleRaise} isLoading={isRaising} disabled={!claimJobCardId}>
          Confirm
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setTarget(null)} disabled={isRaising}>
          Cancel
        </Button>
        {raiseError ? <p className="w-full text-xs text-danger-600 dark:text-danger-400">{raiseError}</p> : null}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Warranty Status</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        {query.isLoading ? <Skeleton className="h-24 w-full" /> : null}
        {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}

        {query.data && labourLines.length === 0 && partLines.length === 0 ? (
          <p className="text-sm text-ink-muted">No warrantied labour or parts on record for this vehicle.</p>
        ) : null}

        {labourLines.length > 0 ? (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-ink-secondary">Labour</span>
            <ul className="flex flex-col divide-y divide-line">
              {labourLines.map((line) => (
                <li key={line.jobCardLabourId} className="flex flex-col gap-1.5 py-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-ink">
                      {line.description}{' '}
                      <Link href={`/job-cards/${line.jobCardId}`} className="text-ink-muted hover:text-accent-600 hover:underline">
                        ({line.jobCardNumber})
                      </Link>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-ink-muted">{line.expiresAt ? `Until ${formatDate(line.expiresAt)}` : '—'}</span>
                      <Badge tone={line.isActive ? 'success' : 'neutral'}>{line.isActive ? 'Active' : 'Expired'}</Badge>
                      {canRaiseClaim && line.isActive && !line.existingClaimId ? (
                        <Button type="button" variant="secondary" size="sm" onClick={() => startRaise({ type: 'labour', line })}>
                          Raise Claim
                        </Button>
                      ) : line.existingClaimId ? (
                        <span className="text-xs text-ink-muted">Claim raised</span>
                      ) : null}
                    </span>
                  </div>
                  {target?.type === 'labour' && target.line.jobCardLabourId === line.jobCardLabourId ? <RaiseClaimRow current={target} /> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {partLines.length > 0 ? (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-ink-secondary">Parts</span>
            <ul className="flex flex-col divide-y divide-line">
              {partLines.map((line) => (
                <li key={line.jobCardPartId} className="flex flex-col gap-1.5 py-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-ink">
                      {line.partName}{' '}
                      <Link href={`/job-cards/${line.jobCardId}`} className="text-ink-muted hover:text-accent-600 hover:underline">
                        ({line.jobCardNumber})
                      </Link>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-ink-muted">
                        {line.expiresAt ? `Until ${formatDate(line.expiresAt)}` : '—'}
                        {line.expiredByKm ? ' · km exceeded' : ''}
                      </span>
                      <Badge tone={line.isActive ? 'success' : 'neutral'}>{line.isActive ? 'Active' : 'Expired'}</Badge>
                      {canRaiseClaim && line.isActive && !line.existingClaimId ? (
                        <Button type="button" variant="secondary" size="sm" onClick={() => startRaise({ type: 'part', line })}>
                          Raise Claim
                        </Button>
                      ) : line.existingClaimId ? (
                        <span className="text-xs text-ink-muted">Claim raised</span>
                      ) : null}
                    </span>
                  </div>
                  {target?.type === 'part' && target.line.jobCardPartId === line.jobCardPartId ? <RaiseClaimRow current={target} /> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
