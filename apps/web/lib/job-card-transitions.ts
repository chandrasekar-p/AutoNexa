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
