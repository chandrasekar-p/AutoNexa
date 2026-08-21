'use client';

import { useState, type DragEvent } from 'react';
import Link from 'next/link';
import { apiPatch, ApiError } from '@/lib/api-client';
import { getValidJobCardTransitions } from '@/lib/job-card-transitions';
import { formatDate } from '@/lib/format';
import { STATUS_LABEL, STATUS_TONE } from './job-card-status-badge';
import type { JobCardListItem, JobCardStatus } from '@/lib/api-types';
import { cn } from '@/lib/cn';

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
  'CANCELLED',
];

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

/**
 * Drag a card to a new column to advance its status — the same PATCH
 * /job-cards/:id/status the detail page's status buttons use, so it's
 * bound by the exact same rules (see JOB_CARD_STATUS_TRANSITIONS): a
 * column is only a valid drop target while dragging if the card's current
 * status can actually transition there, mirrored client-side for the drag
 * highlight but re-validated server-side regardless — same UX-only caveat
 * as every other status-transition affordance in this app.
 */
export function JobCardKanbanBoard({ items, canUpdate, onStatusChanged }: JobCardKanbanBoardProps) {
  const [draggingFrom, setDraggingFrom] = useState<{ id: string; status: JobCardStatus } | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<JobCardStatus | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const columns = COLUMN_STATUSES.map((status) => ({
    status,
    items: items.filter((jc) => jc.status === status),
  }));

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
    if (!getValidJobCardTransitions(draggingFrom.status).includes(columnStatus)) return;
    void moveTo(draggingFrom.id, columnStatus);
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <p className="text-xs text-danger-600 dark:text-danger-400">{error}</p> : null}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {columns.map((column) => {
          const isValidTarget = draggingFrom
            ? draggingFrom.status === column.status || getValidJobCardTransitions(draggingFrom.status).includes(column.status)
            : true;
          const isOwnColumn = draggingFrom?.status === column.status;

          return (
            <div
              key={column.status}
              onDragOver={(e) => {
                if (!isValidTarget || isOwnColumn) return;
                e.preventDefault();
                setDragOverColumn(column.status);
              }}
              onDragLeave={() => setDragOverColumn((c) => (c === column.status ? null : c))}
              onDrop={(e) => handleDrop(e, column.status)}
              className={cn(
                'flex w-72 shrink-0 flex-col rounded-lg border bg-surface',
                dragOverColumn === column.status && isValidTarget ? 'border-accent-400 bg-accent-50 dark:bg-accent-500/10' : 'border-line',
                draggingFrom && !isValidTarget && !isOwnColumn ? 'opacity-50' : '',
              )}
            >
              <div className="relative overflow-hidden rounded-t-lg border-b border-line px-3 py-2.5">
                <div className={cn('absolute inset-x-0 top-0 h-[3px]', TONE_BAR[STATUS_TONE[column.status]])} aria-hidden />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
                    {STATUS_LABEL[column.status]}
                  </span>
                  <span className="num text-xs font-medium text-ink-muted">{column.items.length}</span>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2 p-2">
                {column.items.length === 0 ? (
                  <p className="px-2 py-3 text-center text-xs text-ink-muted">No job cards</p>
                ) : (
                  column.items.map((jobCard) => (
                    <Link
                      key={jobCard.id}
                      href={`/job-cards/${jobCard.id}`}
                      draggable={canUpdate}
                      onDragStart={(e) => {
                        setDraggingFrom({ id: jobCard.id, status: jobCard.status });
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => {
                        setDraggingFrom(null);
                        setDragOverColumn(null);
                      }}
                      className={cn(
                        'flex flex-col gap-1 rounded border border-line bg-surface px-3 py-2.5 shadow-panel hover:border-accent-400',
                        canUpdate ? 'cursor-grab active:cursor-grabbing' : '',
                        movingId === jobCard.id ? 'opacity-50' : '',
                      )}
                    >
                      <span className="num text-sm font-medium text-ink">{jobCard.jobCardNumber}</span>
                      <span className="text-xs text-ink-secondary">{jobCard.customer.name}</span>
                      <span className="num text-xs text-ink-muted">{jobCard.vehicle.registrationNo}</span>
                      {jobCard.expectedDelivery ? (
                        <span className="text-micro text-ink-muted">Due {formatDate(jobCard.expectedDelivery)}</span>
                      ) : null}
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
