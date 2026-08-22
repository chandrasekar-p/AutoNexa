'use client';

import { useState, type FormEvent } from 'react';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { formatDate } from '@/lib/format';
import type { LoyaltyBalance, LoyaltyTransaction, PaginatedResult } from '@/lib/api-types';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

const TYPE_LABEL: Record<LoyaltyTransaction['type'], string> = {
  EARNED: 'Earned',
  REDEEMED: 'Redeemed',
  ADJUSTED: 'Adjusted',
};

interface CustomerLoyaltyCardProps {
  customerId: string;
  canRead: boolean;
  canAdjust: boolean;
}

export function CustomerLoyaltyCard({ customerId, canRead, canAdjust }: CustomerLoyaltyCardProps) {
  const balance = useApiQuery<LoyaltyBalance>(() => apiGet(`/loyalty/customers/${customerId}/balance`), [customerId]);
  const transactions = useApiQuery<PaginatedResult<LoyaltyTransaction>>(
    () => apiGet(`/loyalty/transactions?customerId=${customerId}&pageSize=10`),
    [customerId],
  );

  const [points, setPoints] = useState('');
  const [note, setNote] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  if (!canRead) return null;

  async function handleAdjust(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdjustError(null);
    const pointsValue = Number(points);
    if (!Number.isInteger(pointsValue) || pointsValue === 0) {
      setAdjustError('Points must be a non-zero whole number (negative to deduct).');
      return;
    }
    if (!note.trim()) {
      setAdjustError('A note is required for a manual adjustment.');
      return;
    }
    setIsAdjusting(true);
    try {
      await apiPost('/loyalty/adjust', { customerId, points: pointsValue, note: note.trim() });
      setPoints('');
      setNote('');
      balance.refetch();
      transactions.refetch();
    } catch (err) {
      setAdjustError(err instanceof ApiError ? err.message : 'Could not adjust the balance.');
    } finally {
      setIsAdjusting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Loyalty</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        {balance.isLoading ? <Skeleton className="h-10 w-32" /> : null}
        {balance.error ? <ErrorState message={balance.error} onRetry={balance.refetch} /> : null}
        {balance.data ? (
          <div>
            <span className="num text-3xl font-semibold text-ink">{balance.data.balance}</span>
            <span className="ml-1.5 text-sm text-ink-secondary">points</span>
          </div>
        ) : null}

        {transactions.data && transactions.data.items.length > 0 ? (
          <ul className="flex flex-col divide-y divide-line">
            {transactions.data.items.map((txn) => (
              <li key={txn.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink">
                  {TYPE_LABEL[txn.type]}
                  {txn.note ? <span className="text-ink-muted"> — {txn.note}</span> : null}
                  <span className="block text-xs text-ink-muted">{formatDate(txn.createdAt)}</span>
                </span>
                <span className={`num font-medium ${txn.points > 0 ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}`}>
                  {txn.points > 0 ? '+' : ''}
                  {txn.points}
                </span>
              </li>
            ))}
          </ul>
        ) : transactions.data ? (
          <p className="text-sm text-ink-muted">No loyalty activity yet.</p>
        ) : null}

        {canAdjust ? (
          <form onSubmit={handleAdjust} noValidate className="flex flex-col gap-2 border-t border-line pt-3">
            <p className="text-xs font-medium text-ink-secondary">Manual adjustment (goodwill or correction)</p>
            <div className="flex flex-wrap items-end gap-2">
              <Input
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                placeholder="± points"
                className="h-9 w-28"
                aria-label="Points"
              />
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason" className="h-9 flex-1" aria-label="Note" />
              <Button type="submit" variant="secondary" size="sm" isLoading={isAdjusting}>
                Adjust
              </Button>
            </div>
            {adjustError ? <p className="text-xs text-danger-600 dark:text-danger-400">{adjustError}</p> : null}
          </form>
        ) : null}
      </CardBody>
    </Card>
  );
}
