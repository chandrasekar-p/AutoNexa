import { JobCardStatus } from '@prisma/client';
import { JOB_CARD_STATUS_TRANSITIONS } from './job-card-status-transitions';

const STATUS_LABEL: Record<JobCardStatus, string> = {
  OPEN: 'Open',
  DIAGNOSIS: 'Diagnosis',
  WAITING_APPROVAL: 'Waiting Approval',
  APPROVED: 'Approved',
  IN_PROGRESS: 'In Progress',
  WAITING_PARTS: 'Waiting Parts',
  QUALITY_CHECK: 'Quality Check',
  READY_FOR_DELIVERY: 'Ready for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

/**
 * A human-readable reason for the board/quick-actions UI to show when a
 * drag-drop or menu action attempts an invalid move — named after the
 * *next* status(es) actually reachable from here, since
 * JOB_CARD_STATUS_TRANSITIONS only encodes single-step edges, not full
 * paths to an arbitrary target.
 */
export function explainInvalidJobCardTransition(from: JobCardStatus, to: JobCardStatus): string {
  const targetLabel = STATUS_LABEL[to];
  const nextSteps = JOB_CARD_STATUS_TRANSITIONS[from];

  if (nextSteps.length === 0) {
    return `Job cannot be moved to ${targetLabel} — ${STATUS_LABEL[from]} is a final status.`;
  }

  const nextLabels = nextSteps.map((s) => STATUS_LABEL[s]).join(' or ');
  return `Job cannot be moved to ${targetLabel} yet. It must go through ${nextLabels} first.`;
}
