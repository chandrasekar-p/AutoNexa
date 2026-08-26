'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react';
import { apiPatch, ApiError } from '@/lib/api-client';
import { getValidJobCardTransitions, explainInvalidJobCardTransition } from '@/lib/job-card-transitions';
import { formatMoney, formatDurationMinutes, formatRelativeTimeAgo } from '@/lib/format';
import { STATUS_LABEL, STATUS_TONE } from './job-card-status-badge';
import { JobCardPriorityBadge } from './job-card-priority-badge';
import { JobCardDelayIndicator } from './job-card-delay-indicator';
import { JobCardActionsMenu } from './job-card-actions-menu';
import { VehicleThumbnail } from './vehicle-thumbnail';
import { ProgressBar } from '@/components/ui/progress-bar';
import type { JobCardListItem, JobCardStatus } from '@/lib/api-types';
import { cn } from '@/lib/cn';

// CANCELLED is deliberately not a primary board column (spec: don't let it
// consume board real estate) — reachable via the List view's status
// filter instead, which is already list-view-only in the parent page.
const COLUMN_STATUSES: JobCardStatus[] = [
  'OPEN',
  'DIAGNOSIS',
  'WAITING_APPROVAL',
  'APPROVED',
  'IN_PROGRESS',
  'WAITING_PARTS',
  'QUALITY_CHECK',
  'READY_FOR_DELIVERY',
  'DELIVERED',
];

// Progress bar only for the "active repair" statuses — a compact,
// meaningful signal there; not useful noise on a paperwork-stage card.
const ACTIVE_PROGRESS_STATUSES: JobCardStatus[] = ['IN_PROGRESS', 'WAITING_PARTS', 'QUALITY_CHECK'];

const TONE_BAR: Record<'neutral' | 'accent' | 'warning' | 'success' | 'danger', string> = {
  neutral: 'bg-graphite-300',
  accent: 'bg-accent-500',
  warning: 'bg-warning-500',
  success: 'bg-success-500',
  danger: 'bg-danger-500',
};

interface JobCardKanbanBoardProps {
  items: JobCardListItem[];
  canUpdate: boolean;
  onStatusChanged: () => void;
}

function JobCard({
  jobCard,
  canUpdate,
  isMoving,
  onDragStart,
  onDragEnd,
  onStatusChanged,
  onError,
}: {
  jobCard: JobCardListItem;
  canUpdate: boolean;
  isMoving: boolean;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onStatusChanged: () => void;
  onError: (message: string) => void;
}) {
  return (
    <div
      draggable={canUpdate}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'flex flex-col gap-2 rounded-lg border border-line bg-surface p-3 shadow-panel hover:border-accent-400',
        canUpdate ? 'cursor-grab active:cursor-grabbing' : '',
        isMoving ? 'opacity-50' : '',
      )}
    >
      <div className="flex items-start gap-2.5">
        <VehicleThumbnail photoUrl={jobCard.vehicle.photoUrl} alt={jobCard.vehicle.registrationNo} className="h-11 w-11" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <Link href={`/job-cards/${jobCard.id}`} className="num truncate text-sm font-semibold text-ink hover:text-accent-600">
              {jobCard.jobCardNumber}
            </Link>
            <JobCardActionsMenu
              jobCardId={jobCard.id}
              status={jobCard.status}
              canUpdate={canUpdate}
              onStatusChanged={onStatusChanged}
              onError={onError}
            />
          </div>
          <JobCardPriorityBadge priority={jobCard.priority} />
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="truncate text-sm text-ink">{jobCard.customer.name}</span>
        <span className="num truncate text-xs text-ink-muted">
          {jobCard.vehicle.brand} {jobCard.vehicle.model} · {jobCard.vehicle.registrationNo}
        </span>
      </div>

      {jobCard.complaint ? (
        <span className="w-fit truncate rounded-full bg-surface-hover px-2 py-0.5 text-micro font-medium text-ink-secondary">
          {jobCard.complaint}
        </span>
      ) : null}

      {jobCard.technician ? (
        <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
          <span className="truncate">{jobCard.technician.name}</span>
          {jobCard.estimatedHours > 0 ? (
            <span className="flex shrink-0 items-center gap-0.5 text-ink-muted">
              <Clock className="h-3 w-3" aria-hidden />
              {formatDurationMinutes(Math.round(jobCard.estimatedHours * 60))}
            </span>
          ) : null}
        </div>
      ) : null}

      {ACTIVE_PROGRESS_STATUSES.includes(jobCard.status) && jobCard.progressPercent !== null ? (
        <div className="flex items-center gap-2">
          <ProgressBar value={jobCard.progressPercent} className="flex-1" />
          <span className="num shrink-0 text-micro text-ink-muted">{jobCard.progressPercent}%</span>
        </div>
      ) : null}

      {jobCard.partsPending > 0 ? (
        <span className="text-micro font-medium text-warning-700 dark:text-warning-400">
          {jobCard.partsPending} of {jobCard.partsTotal} parts low in stock
        </span>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <span className="num text-xs font-medium text-ink">
          {Number(jobCard.estimatedTotal) > 0 ? `Est. ${formatMoney(jobCard.estimatedTotal)}` : 'Estimate Pending'}
        </span>
        {jobCard.delayStatus ? <JobCardDelayIndicator status={jobCard.delayStatus} days={jobCard.delayDays} /> : null}
      </div>

      <span className="text-micro text-ink-muted">Created {formatRelativeTimeAgo(jobCard.createdAt)}</span>
    </div>
  );
}

/**
 * Drag a card to a new column to advance its status — the same PATCH
 * /job-cards/:id/status the detail page's status buttons use, so it's
 * bound by the exact same rules (see JOB_CARD_STATUS_TRANSITIONS): a
 * column is only a valid drop target while dragging if the card's current
 * status can actually transition there, mirrored client-side for the drag
 * highlight but re-validated server-side regardless — same UX-only caveat
 * as every other status-transition affordance in this app. A rejected
 * drop surfaces explainInvalidJobCardTransition's message rather than
 * silently doing nothing.
 */
export function JobCardKanbanBoard({ items, canUpdate, onStatusChanged }: JobCardKanbanBoardProps) {
  const [draggingFrom, setDraggingFrom] = useState<{ id: string; status: JobCardStatus } | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<JobCardStatus | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const columns = COLUMN_STATUSES.map((status) => ({
    status,
    items: items.filter((jc) => jc.status === status),
  }));

  // Nine ~300px columns overflow every screen width this app supports, so
  // the arrow buttons (not just the scrollbar/trackpad) are the primary
  // way most people will move between columns — recompute the disabled
  // edges on scroll and whenever the column set itself changes width.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function updateScrollState() {
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }
    updateScrollState();
    el.addEventListener('scroll', updateScrollState);
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [items.length]);

  function scrollByColumn(direction: 1 | -1) {
    scrollRef.current?.scrollBy({ left: direction * 320, behavior: 'smooth' });
  }

  async function moveTo(jobCardId: string, status: JobCardStatus) {
    setMovingId(jobCardId);
    setError(null);
    try {
      await apiPatch(`/job-cards/${jobCardId}/status`, { status });
      onStatusChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not move this job card.');
    } finally {
      setMovingId(null);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, columnStatus: JobCardStatus) {
    event.preventDefault();
    setDragOverColumn(null);
    if (!draggingFrom || draggingFrom.status === columnStatus) return;
    if (!getValidJobCardTransitions(draggingFrom.status).includes(columnStatus)) {
      setError(explainInvalidJobCardTransition(draggingFrom.status, columnStatus));
      return;
    }
    void moveTo(draggingFrom.id, columnStatus);
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p
          role="alert"
          className="rounded border border-danger-100 bg-danger-50 px-3 py-2 text-xs text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400"
        >
          {error}
        </p>
      ) : null}
      <div className="relative">
        {/*
          A zero-height "rail" that's sticky on the vertical axis only —
          its own box takes no space (so it never pushes the columns
          down), but the buttons inside it overflow that zero height and
          stay fully visible/clickable. `<main>` (app/(dashboard)/layout.tsx)
          is the actual scrolling ancestor here, not the window, and sticky
          respects whichever scrollable ancestor it finds — so the arrows
          track vertical scroll through a tall board instead of scrolling
          away with it. Absolute left-0/right-0 inside a full-width relative
          box (not flex `justify-between`) so either arrow can be hidden at
          a scroll edge without the other one jumping to the wrong side.
        */}
        <div className="sticky top-4 z-20 h-0">
          <div className="relative">
            {canScrollLeft ? (
              <button
                type="button"
                onClick={() => scrollByColumn(-1)}
                aria-label="Scroll columns left"
                className="absolute left-0 -ml-3 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-panel hover:bg-surface-hover"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
            {canScrollRight ? (
              <button
                type="button"
                onClick={() => scrollByColumn(1)}
                aria-label="Scroll columns right"
                className="absolute right-0 -mr-3 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-panel hover:bg-surface-hover"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
        <div ref={scrollRef} className="flex items-start gap-4 overflow-x-auto pb-2">
          {columns.map((column) => {
            const isValidTarget = draggingFrom
              ? draggingFrom.status === column.status || getValidJobCardTransitions(draggingFrom.status).includes(column.status)
              : true;
            const isOwnColumn = draggingFrom?.status === column.status;

            return (
              <div
                key={column.status}
                onDragOver={(e) => {
                  if (isOwnColumn) return;
                  e.preventDefault();
                  setDragOverColumn(column.status);
                }}
                onDragLeave={() => setDragOverColumn((c) => (c === column.status ? null : c))}
                onDrop={(e) => handleDrop(e, column.status)}
                className={cn(
                  'flex w-[300px] shrink-0 flex-col rounded-lg border bg-surface',
                  dragOverColumn === column.status && isValidTarget ? 'border-accent-400 bg-accent-50 dark:bg-accent-500/10' : 'border-line',
                  draggingFrom && !isValidTarget && !isOwnColumn ? 'opacity-50' : '',
                )}
              >
                <div className="relative overflow-hidden rounded-t-lg border-b border-line bg-surface px-3 py-2.5">
                  <div className={cn('absolute inset-x-0 top-0 h-[3px]', TONE_BAR[STATUS_TONE[column.status]])} aria-hidden />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">{STATUS_LABEL[column.status]}</span>
                    <span className="num text-xs font-medium text-ink-muted">{column.items.length}</span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-2 p-2">
                  {column.items.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-2 py-6 text-center">
                      <p className="text-xs text-ink-muted">No jobs in this stage</p>
                      {canUpdate ? (
                        <Link href="/job-cards/new" className="flex items-center gap-1 text-xs font-medium text-accent-600 hover:underline">
                          <Plus className="h-3 w-3" aria-hidden />
                          Add Job Card
                        </Link>
                      ) : null}
                    </div>
                  ) : (
                    column.items.map((jobCard) => (
                      <JobCard
                        key={jobCard.id}
                        jobCard={jobCard}
                        canUpdate={canUpdate}
                        isMoving={movingId === jobCard.id}
                        onDragStart={(e) => {
                          setDraggingFrom({ id: jobCard.id, status: jobCard.status });
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                          setDraggingFrom(null);
                          setDragOverColumn(null);
                        }}
                        onStatusChanged={onStatusChanged}
                        onError={setError}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
