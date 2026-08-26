'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MoreVertical } from 'lucide-react';
import { apiPatch, ApiError } from '@/lib/api-client';
import { getValidJobCardTransitions } from '@/lib/job-card-transitions';
import { STATUS_LABEL } from './job-card-status-badge';
import type { JobCardStatus } from '@/lib/api-types';
import { cn } from '@/lib/cn';

const TRANSITION_VERB: Partial<Record<JobCardStatus, string>> = {
  DIAGNOSIS: 'Start Diagnosis',
  WAITING_APPROVAL: 'Send for Approval',
  APPROVED: 'Approve',
  IN_PROGRESS: 'Start / Resume Job',
  WAITING_PARTS: 'Mark Waiting for Parts',
  QUALITY_CHECK: 'Move to Quality Check',
  READY_FOR_DELIVERY: 'Mark Ready for Delivery',
  DELIVERED: 'Mark Delivered',
};

interface JobCardActionsMenuProps {
  jobCardId: string;
  status: JobCardStatus;
  canUpdate: boolean;
  onStatusChanged: () => void;
  onError: (message: string) => void;
}

/**
 * The "⋮" quick-action menu — deliberately scoped to what's real:
 * View/Open, every currently-valid status transition (same PATCH
 * /job-cards/:id/status the board's drag-and-drop uses, so identical
 * rules/audit trail), and Cancel (prompts for a reason, stored on
 * JobCardStatusHistory.notes). Assigning a technician, adding parts,
 * sending estimates/updates, and printing already have full flows on the
 * job card detail page — duplicating half of them here as menu items
 * would be exactly the "static mockup" surface the redesign is meant to
 * avoid, so they're intentionally not repeated in this menu.
 */
export function JobCardActionsMenu({ jobCardId, status, canUpdate, onStatusChanged, onError }: JobCardActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  async function moveTo(next: JobCardStatus, notes?: string) {
    setIsMoving(true);
    setIsOpen(false);
    try {
      await apiPatch(`/job-cards/${jobCardId}/status`, { status: next, notes });
      onStatusChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not update this job card.');
    } finally {
      setIsMoving(false);
    }
  }

  function handleCancel() {
    const reason = window.prompt('Reason for cancelling this job card:');
    if (reason === null) return; // user dismissed the prompt
    if (!reason.trim()) {
      onError('A cancellation reason is required.');
      return;
    }
    void moveTo('CANCELLED', reason.trim());
  }

  const transitions = canUpdate ? getValidJobCardTransitions(status) : [];
  const forwardTransitions = transitions.filter((t) => t !== 'CANCELLED');
  const canCancel = transitions.includes('CANCELLED');

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((v) => !v);
        }}
        disabled={isMoving}
        aria-label="Job card actions"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex h-6 w-6 items-center justify-center rounded text-ink-muted hover:bg-surface-hover hover:text-ink disabled:opacity-50"
      >
        <MoreVertical className="h-3.5 w-3.5" aria-hidden />
      </button>

      {isOpen ? (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-card"
        >
          <Link
            href={`/job-cards/${jobCardId}`}
            role="menuitem"
            className="block px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover"
            onClick={() => setIsOpen(false)}
          >
            Open Job Card
          </Link>

          {forwardTransitions.length > 0 ? <div className="my-1 border-t border-line" /> : null}
          {forwardTransitions.map((next) => (
            <button
              key={next}
              type="button"
              role="menuitem"
              onClick={() => void moveTo(next)}
              className="block w-full px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover"
            >
              {TRANSITION_VERB[next] ?? `Move to ${STATUS_LABEL[next]}`}
            </button>
          ))}

          {canCancel ? (
            <>
              <div className="my-1 border-t border-line" />
              <button
                type="button"
                role="menuitem"
                onClick={handleCancel}
                className={cn('block w-full px-3 py-1.5 text-left text-xs hover:bg-danger-50 dark:hover:bg-danger-500/10', 'text-danger-600 dark:text-danger-400')}
              >
                Cancel Job
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
