import Link from 'next/link';
import { ChevronRight, FileText, IndianRupee, PackageX } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney, formatNumber, formatQuantity } from '@/lib/format';
import type { AlertsLowStockPart, DashboardSummary } from '@/lib/api-types';

interface NeedsAttentionRow {
  key: string;
  href: string;
  icon: typeof IndianRupee;
  tone: 'warning' | 'danger';
  title: string;
  subtitle: string;
}

interface Props {
  summary: DashboardSummary | null;
  lowStockParts: AlertsLowStockPart[] | null;
  isLoading: boolean;
}

/**
 * Compact three-signal summary — pending payments, estimates awaiting
 * approval, low stock — distinct from the fuller DashboardAlertsCard
 * further down the page (expiring documents, delayed job cards). Built
 * entirely from the two API calls the dashboard page already makes
 * (summary + alerts); no new endpoint, this is just a different framing
 * of existing data.
 */
export function NeedsAttentionCard({ summary, lowStockParts, isLoading }: Props) {
  const rows: NeedsAttentionRow[] = [];

  if (summary?.pendingPayments && summary.pendingPayments.count > 0) {
    rows.push({
      key: 'payments',
      href: '/invoices',
      icon: IndianRupee,
      tone: 'danger',
      title: `${formatNumber(summary.pendingPayments.count)} Pending Payment${summary.pendingPayments.count === 1 ? '' : 's'}`,
      subtitle: `${formatMoney(summary.pendingPayments.totalOutstanding)} outstanding`,
    });
  }

  if (summary && summary.pendingEstimates > 0) {
    rows.push({
      key: 'estimates',
      href: '/estimates',
      icon: FileText,
      tone: 'warning',
      title: `${formatNumber(summary.pendingEstimates)} Estimate${summary.pendingEstimates === 1 ? '' : 's'} Awaiting Approval`,
      subtitle: 'Sent to customer, no decision yet',
    });
  }

  if (lowStockParts && lowStockParts.length > 0) {
    const first = lowStockParts[0]!;
    rows.push({
      key: 'low-stock',
      href: '/parts-inventory',
      icon: PackageX,
      tone: 'warning',
      title: `${formatNumber(lowStockParts.length)} Low Stock Part${lowStockParts.length === 1 ? '' : 's'}`,
      subtitle: `${first.name} — ${formatQuantity(first.currentStock, first.unit)} remaining`,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base normal-case tracking-normal text-ink">Needs Attention</CardTitle>
        {rows.length > 0 ? (
          <span className="num flex h-6 min-w-6 items-center justify-center rounded-full bg-danger-500 px-1.5 text-xs font-semibold text-white">
            {rows.length}
          </span>
        ) : null}
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : null}
        {!isLoading && rows.length === 0 ? <p className="text-sm text-ink-muted">Nothing needs attention right now.</p> : null}
        {!isLoading && rows.length > 0 ? (
          <ul className="flex flex-col divide-y divide-line">
            {rows.map((row) => (
              <li key={row.key}>
                <Link href={row.href} className="group flex items-center gap-3 py-3">
                  <span
                    className={
                      row.tone === 'danger'
                        ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-danger-50 text-danger-600 dark:bg-danger-500/15 dark:text-danger-400'
                        : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400'
                    }
                    aria-hidden
                  >
                    <row.icon className="h-4 w-4" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-ink">{row.title}</span>
                    <span className="truncate text-xs text-ink-secondary">{row.subtitle}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {!isLoading && rows.length > 0 ? (
          <a
            href="#dashboard-alerts"
            className="mt-1 flex items-center gap-1.5 border-t border-line pt-3 text-sm font-medium text-accent-600 hover:underline dark:text-accent-400"
          >
            View All Alerts
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </a>
        ) : null}
      </CardBody>
    </Card>
  );
}
