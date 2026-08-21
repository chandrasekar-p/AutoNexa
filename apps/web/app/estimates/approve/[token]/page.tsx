'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// Deliberately its own top-level route, outside both (auth) and
// (dashboard) — inherits only the root layout (fonts, theme), none of the
// dashboard chrome or the login page's photo backdrop. No useAuth() call
// anywhere on this page: a customer opening this link has no session, and
// apiGet/apiPost already only attach an Authorization header when one
// exists in memory — for an anonymous visitor it's simply absent, which
// is exactly what the unauthenticated /estimates/approve/:token API
// expects. See the architecture doc §8.

interface EstimateApprovalSummary {
  estimateNumber: string;
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
  jobDescription: string | null;
  vehicleLabel: string;
  customerName: string;
  lineItems: { description: string; quantity: string; unitPrice: string; gstRate: string; lineTotal: string }[];
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  total: string;
}

const STATUS_MESSAGE: Partial<Record<EstimateApprovalSummary['status'], string>> = {
  APPROVED: "You've approved this estimate.",
  REJECTED: "You've rejected this estimate.",
  CONVERTED: 'This estimate has already been approved and is now being worked on.',
};

export default function EstimateApprovalPage() {
  const params = useParams<{ token: string }>();
  const [summary, setSummary] = useState<EstimateApprovalSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [decideError, setDecideError] = useState<string | null>(null);
  const [decidingAction, setDecidingAction] = useState<'APPROVED' | 'REJECTED' | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    apiGet<EstimateApprovalSummary>(`/estimates/approve/${params.token}`)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.token]);

  async function handleDecide(action: 'APPROVED' | 'REJECTED') {
    setDecidingAction(action);
    setDecideError(null);
    try {
      const path = action === 'APPROVED' ? 'approve' : 'reject';
      const data = await apiPost<EstimateApprovalSummary>(`/estimates/approve/${params.token}/${path}`);
      setSummary(data);
    } catch (err) {
      setDecideError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setDecidingAction(null);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 bg-canvas px-4 py-8 text-ink">
      <h1 className="text-xl font-semibold">Service Estimate</h1>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      ) : null}

      {!isLoading && loadError ? (
        <div className="rounded-lg border border-danger-100 bg-danger-50 px-4 py-5 text-sm text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400">
          {loadError}
        </div>
      ) : null}

      {!isLoading && summary ? (
        <div className="flex flex-col gap-6">
          <div className="rounded-lg border border-line bg-surface px-4 py-4 shadow-card">
            <p className="num text-sm font-medium text-ink-secondary">{summary.estimateNumber}</p>
            <p className="text-sm text-ink-secondary">{summary.vehicleLabel}</p>
            {summary.jobDescription ? <p className="mt-2 text-sm text-ink">{summary.jobDescription}</p> : null}
          </div>

          <div className="overflow-x-auto rounded-lg border border-line bg-surface shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-micro font-semibold uppercase tracking-wide text-ink-secondary">
                  <th className="px-4 py-2">Item</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {summary.lineItems.map((item, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <td className="px-4 py-2 text-ink">{item.description}</td>
                    <td className="num px-4 py-2 text-right text-ink-secondary">{item.quantity}</td>
                    <td className="num px-4 py-2 text-right text-ink">{formatMoney(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-col gap-1 border-t border-line px-4 py-3">
              <SummaryLine label="Subtotal" value={formatMoney(summary.subtotal)} />
              <SummaryLine label="Tax" value={formatMoney(summary.taxAmount)} />
              {Number(summary.discountAmount) > 0 ? (
                <SummaryLine label="Discount" value={`-${formatMoney(summary.discountAmount)}`} />
              ) : null}
              <SummaryLine label="Total" value={formatMoney(summary.total)} emphasized />
            </div>
          </div>

          {summary.status === 'SENT' ? (
            <div className="flex flex-col gap-3">
              {decideError ? (
                <p className="rounded border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400">
                  {decideError}
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  onClick={() => handleDecide('REJECTED')}
                  isLoading={decidingAction === 'REJECTED'}
                  disabled={decidingAction !== null}
                >
                  Reject
                </Button>
                <Button onClick={() => handleDecide('APPROVED')} isLoading={decidingAction === 'APPROVED'} disabled={decidingAction !== null}>
                  Approve
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-line bg-surface-hover px-4 py-4 text-center text-sm text-ink-secondary">
              {STATUS_MESSAGE[summary.status] ?? 'This estimate is no longer awaiting your approval.'}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SummaryLine({ label, value, emphasized }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={emphasized ? 'text-sm font-medium text-ink' : 'text-xs text-ink-secondary'}>{label}</span>
      <span className={emphasized ? 'num text-base font-semibold text-ink' : 'num text-xs text-ink-secondary'}>{value}</span>
    </div>
  );
}
