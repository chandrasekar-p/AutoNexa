'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { formatDate } from '@/lib/format';
import { warrantyClaimOriginalLabel } from '@/lib/warranty-claim-label';
import type { PaginatedResult, WarrantyClaim, WarrantyClaimStatus } from '@/lib/api-types';
import { WarrantyClaimStatusBadge } from '@/components/domain/warranty-claim-status-badge';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const PAGE_SIZE = 20;
const STATUS_OPTIONS: (WarrantyClaimStatus | 'ALL')[] = ['OPEN', 'APPROVED', 'REJECTED', 'RESOLVED', 'ALL'];

export default function WarrantyClaimsPage() {
  const canUpdate = usePermission('warranty-claim:update');

  const [status, setStatus] = useState<WarrantyClaimStatus | 'ALL'>('OPEN');
  const [page, setPage] = useState(1);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const query = useApiQuery<PaginatedResult<WarrantyClaim>>(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (status !== 'ALL') params.set('status', status);
    return apiGet(`/warranty-claims?${params.toString()}`);
  }, [status, page]);

  function handleStatusChange(next: WarrantyClaimStatus | 'ALL') {
    setStatus(next);
    setPage(1);
  }

  async function handleDecision(id: string, decision: 'APPROVED' | 'REJECTED', isBillable: boolean) {
    setActioningId(id);
    setActionError(null);
    try {
      await apiPatch(`/warranty-claims/${id}`, { status: decision, isBillable });
      query.refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not update this claim.');
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Warranty Claims</h1>
        <p className="text-sm text-ink-secondary">Comeback claims raised against a prior job card&rsquo;s warrantied labour/parts.</p>
      </div>

      <div className="w-48">
        <Select label="Status" value={status} onChange={(e) => handleStatusChange(e.target.value as WarrantyClaimStatus | 'ALL')}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>
      </div>

      {actionError ? <ErrorState message={actionError} /> : null}

      {query.isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}

      {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}

      {query.data && query.data.items.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface px-5 py-10 text-center text-sm text-ink-muted">No warranty claims in this status.</p>
      ) : null}

      {query.data && query.data.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-line bg-surface shadow-card">
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Claim Job Card</TableHeaderCell>
                  <TableHeaderCell>Original Item</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Billable</TableHeaderCell>
                  <TableHeaderCell>Raised</TableHeaderCell>
                  {canUpdate ? <TableHeaderCell className="w-64" /> : null}
                </tr>
              </TableHead>
              <TableBody>
                {query.data.items.map((claim) => (
                  <TableRow key={claim.id}>
                    <TableCell>
                      <Link href={`/job-cards/${claim.claimJobCardId}`} className="num font-medium hover:text-accent-600">
                        {claim.claimJobCard.jobCardNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{warrantyClaimOriginalLabel(claim)}</TableCell>
                    <TableCell>
                      <WarrantyClaimStatusBadge status={claim.status} />
                    </TableCell>
                    <TableCell>
                      <Badge tone={claim.isBillable ? 'neutral' : 'success'}>{claim.isBillable ? 'Billable' : 'Free'}</Badge>
                    </TableCell>
                    <TableCell className="text-ink-secondary">{formatDate(claim.createdAt)}</TableCell>
                    {canUpdate ? (
                      <TableCell>
                        {claim.status === 'OPEN' ? (
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDecision(claim.id, 'APPROVED', false)}
                              isLoading={actioningId === claim.id}
                            >
                              Approve — Free
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDecision(claim.id, 'APPROVED', true)}
                              isLoading={actioningId === claim.id}
                            >
                              Approve — Billable
                            </Button>
                            <button
                              type="button"
                              onClick={() => handleDecision(claim.id, 'REJECTED', true)}
                              disabled={actioningId === claim.id}
                              className="text-xs text-danger-600 hover:underline dark:text-danger-400"
                            >
                              Reject
                            </button>
                          </div>
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={query.data.page} totalPages={query.data.totalPages} total={query.data.total} onPageChange={setPage} />
        </div>
      ) : null}
    </div>
  );
}
