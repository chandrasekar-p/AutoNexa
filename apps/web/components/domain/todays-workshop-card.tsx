'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreVertical } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { VehicleThumbnail } from '@/components/domain/vehicle-thumbnail';
import { STATUS_LABEL, STATUS_TONE } from '@/components/domain/job-card-status-badge';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/cn';
import type { DashboardSummary } from '@/lib/api-types';

type StatusTone = (typeof STATUS_TONE)[keyof typeof STATUS_TONE];

const STATUS_DOT_CLASS: Record<StatusTone, string> = {
  neutral: 'bg-graphite-400',
  accent: 'bg-accent-500',
  warning: 'bg-warning-500',
  success: 'bg-success-500',
  danger: 'bg-danger-500',
};

const STATUS_TEXT_CLASS: Record<StatusTone, string> = {
  neutral: 'text-ink-secondary',
  accent: 'text-accent-600 dark:text-accent-400',
  warning: 'text-warning-600 dark:text-warning-400',
  success: 'text-success-600 dark:text-success-400',
  danger: 'text-danger-600 dark:text-danger-400',
};

/** Dot + colored text, not the pill-shaped JobCardStatusBadge used on the full Job Cards list — a lighter-weight treatment for this dashboard summary table, same underlying STATUS_TONE/STATUS_LABEL mapping so the color meaning never diverges. */
function StatusDot({ status }: { status: DashboardSummary['todaysWorkshop'][number]['status'] }) {
  const tone = STATUS_TONE[status];
  return (
    <span className={cn('flex items-center gap-1.5 text-sm font-medium', STATUS_TEXT_CLASS[tone])}>
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT_CLASS[tone])} aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

type WorkshopRow = DashboardSummary['todaysWorkshop'][number];

/** Per-row ⋮ menu — same click-outside/Escape pattern as UserMenu/NotificationBell. Pure navigation, no new business logic: every link here already exists elsewhere in the app. */
function RowActionsMenu({ row }: { row: WorkshopRow }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function go(href: string) {
    setIsOpen(false);
    router.push(href);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Row actions"
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded text-ink-secondary hover:bg-surface-hover hover:text-ink',
          isOpen && 'bg-surface-hover text-ink',
        )}
      >
        <MoreVertical className="h-4 w-4" aria-hidden />
      </button>
      {isOpen ? (
        <div role="menu" className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-lg border border-line bg-surface shadow-card">
          <button
            type="button"
            role="menuitem"
            onClick={() => go(`/job-cards/${row.id}`)}
            className="flex w-full items-center px-3 py-2 text-left text-sm text-ink-secondary hover:bg-surface-hover hover:text-ink"
          >
            View Job Card
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => go(`/vehicles/${row.vehicle.id}`)}
            className="flex w-full items-center px-3 py-2 text-left text-sm text-ink-secondary hover:bg-surface-hover hover:text-ink"
          >
            View Vehicle
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => go(`/customers/${row.customerId}`)}
            className="flex w-full items-center px-3 py-2 text-left text-sm text-ink-secondary hover:bg-surface-hover hover:text-ink"
          >
            View Customer
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface Props {
  jobCards: DashboardSummary['todaysWorkshop'] | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

/** Live shop-floor snapshot — the 5 most recently-active non-terminal job cards, capped server-side. VehicleThumbnail and the technician Avatar both show a real uploaded photo once one exists, falling back to a generic icon / initials circle otherwise. */
export function TodaysWorkshopCard({ jobCards, isLoading, error, onRetry }: Props) {
  return (
    <Card>
      <CardHeader className="items-start">
        <div>
          <CardTitle>Today&rsquo;s Workshop</CardTitle>
          <p className="text-xs text-ink-secondary">Live status of vehicles in your workshop</p>
        </div>
        <Link
          href="/job-cards"
          className="flex h-8 shrink-0 items-center rounded border border-line px-3 text-xs font-medium text-ink hover:bg-surface-hover"
        >
          View All Jobs
        </Link>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : null}
        {error ? <ErrorState message={error} onRetry={onRetry} /> : null}
        {jobCards && jobCards.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-6 text-center">
            <p className="text-sm font-medium text-ink">No vehicles currently in workshop</p>
            <p className="text-xs text-ink-muted">All vehicles have been completed or delivered.</p>
            <Link href="/job-cards" className="mt-2 text-sm font-medium text-accent-600 hover:underline dark:text-accent-400">
              View Job Cards
            </Link>
          </div>
        ) : null}
        {jobCards && jobCards.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-micro font-semibold uppercase tracking-wide text-ink-secondary">
                  <th className="py-2 pr-3">Vehicle</th>
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">Job / Service</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pl-3 pr-3">Technician</th>
                  <th className="py-2 pl-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobCards.map((jc) => (
                  <tr key={jc.id} className="border-b border-line last:border-0">
                    <td className="py-3 pr-3">
                      <Link href={`/job-cards/${jc.id}`} className="flex items-center gap-3 hover:underline">
                        <VehicleThumbnail photoUrl={jc.vehicle.photoUrl} alt={`${jc.vehicle.brand} ${jc.vehicle.model}`} />
                        <span className="flex flex-col">
                          <span className="font-medium text-ink">{jc.vehicle.brand} {jc.vehicle.model}</span>
                          <span className="num text-xs text-ink-muted">{jc.vehicle.registrationNo}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 pr-3 text-ink-secondary">{jc.customerName}</td>
                    <td className="max-w-[220px] truncate py-3 pr-3 text-ink-secondary">{jc.complaint ?? '—'}</td>
                    <td className="py-3 pr-3">
                      <StatusDot status={jc.status} />
                    </td>
                    <td className="py-3 pl-3 pr-3">
                      {jc.technicianName ? (
                        <span className="flex items-center gap-2">
                          <Avatar name={jc.technicianName} photoUrl={jc.technicianAvatarUrl} size="sm" />
                          <span className="text-ink-secondary">{jc.technicianName}</span>
                        </span>
                      ) : (
                        <span className="text-ink-muted">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <RowActionsMenu row={jc} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
