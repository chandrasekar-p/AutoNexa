import type { JobCardStatus } from './api-types';

/**
 * Mirrors the backend's JOB_CARD_STATUS_TRANSITIONS exactly (see
 * apps/api/src/modules/job-cards/job-card-status-transitions.ts) — this is
 * UX only (which status-advance buttons to show), not the enforcement
 * boundary; PATCH /job-cards/:id/status validates the transition itself
 * and 400s on an invalid one regardless of what this map says. Kept in
 * sync by hand since the two apps don't share a types package yet.
 */
export const JOB_CARD_STATUS_TRANSITIONS: Record<JobCardStatus, JobCardStatus[]> = {
  OPEN: ['DIAGNOSIS', 'CANCELLED'],
  DIAGNOSIS: ['WAITING_APPROVAL', 'CANCELLED'],
  WAITING_APPROVAL: ['APPROVED', 'CANCELLED'],
  APPROVED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_PARTS', 'QUALITY_CHECK', 'CANCELLED'],
  WAITING_PARTS: ['IN_PROGRESS', 'CANCELLED'],
  QUALITY_CHECK: ['IN_PROGRESS', 'READY_FOR_DELIVERY'],
  READY_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export function getValidJobCardTransitions(from: JobCardStatus): JobCardStatus[] {
  return JOB_CARD_STATUS_TRANSITIONS[from];
}

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
 * Mirrors the backend's explainInvalidJobCardTransition (same
 * apps-don't-share-types precedent as JOB_CARD_STATUS_TRANSITIONS above)
 * — a human-readable reason to show on a rejected drag/quick-action,
 * naming the actual next status(es) reachable from here.
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
