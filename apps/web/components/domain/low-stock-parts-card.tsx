import Link from 'next/link';
import { Package } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/lib/format';
import type { AlertsLowStockPart } from '@/lib/api-types';

interface Props {
  parts: AlertsLowStockPart[] | null;
  isLoading: boolean;
}

/** Reuses GET /notifications/alerts's lowStockParts — same data DashboardAlertsCard/NeedsAttentionCard already fetch, just its own focused list here. */
export function LowStockPartsCard({ parts, isLoading }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base normal-case tracking-normal text-ink">Low Stock Parts</CardTitle>
        <Link href="/parts-inventory" className="text-sm font-medium text-accent-600 hover:underline dark:text-accent-400">
          View All
        </Link>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : null}
        {!isLoading && parts && parts.length === 0 ? <p className="text-sm text-ink-muted">Nothing low on stock.</p> : null}
        {!isLoading && parts && parts.length > 0 ? (
          <ul className="flex flex-col divide-y divide-line">
            {parts.slice(0, 5).map((part) => (
              <li key={part.id}>
                <Link href={`/parts-inventory/${part.id}`} className="flex items-center gap-3 py-2.5 hover:bg-surface-hover">
                  <Package className="h-4 w-4 shrink-0 text-ink-secondary" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{part.name}</span>
                  {/* Critically low (at or under half of the reorder threshold) reads danger, not just warning — same severity signal Needs Attention's "urgent vs. attention" color rule uses. */}
                  <Badge tone={part.currentStock <= part.minStock / 2 ? 'danger' : 'warning'}>{formatNumber(part.currentStock)} left</Badge>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </CardBody>
    </Card>
  );
}
