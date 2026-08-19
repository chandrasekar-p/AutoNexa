import { JobCardStatus } from '@prisma/client';

/**
 * Explicit allowed-transitions map for the Job Card status pipeline
 * (Phase 1, Section 10's operational core). Pure and DB-free so it's
 * unit-testable on its own — mirrors estimate-totals.ts's approach.
 * DELIVERED and CANCELLED are terminal: zero allowed transitions out.
 */
export const JOB_CARD_STATUS_TRANSITIONS: Record<JobCardStatus, JobCardStatus[]> = {
  [JobCardStatus.OPEN]: [JobCardStatus.DIAGNOSIS, JobCardStatus.CANCELLED],
  [JobCardStatus.DIAGNOSIS]: [JobCardStatus.WAITING_APPROVAL, JobCardStatus.CANCELLED],
  [JobCardStatus.WAITING_APPROVAL]: [JobCardStatus.APPROVED, JobCardStatus.CANCELLED],
  [JobCardStatus.APPROVED]: [JobCardStatus.IN_PROGRESS, JobCardStatus.CANCELLED],
  [JobCardStatus.IN_PROGRESS]: [
    JobCardStatus.WAITING_PARTS,
    JobCardStatus.QUALITY_CHECK,
    JobCardStatus.CANCELLED,
  ],
  [JobCardStatus.WAITING_PARTS]: [JobCardStatus.IN_PROGRESS, JobCardStatus.CANCELLED],
  [JobCardStatus.QUALITY_CHECK]: [JobCardStatus.IN_PROGRESS, JobCardStatus.READY_FOR_DELIVERY],
  [JobCardStatus.READY_FOR_DELIVERY]: [JobCardStatus.DELIVERED],
  [JobCardStatus.DELIVERED]: [],
  [JobCardStatus.CANCELLED]: [],
};

export function isValidJobCardTransition(from: JobCardStatus, to: JobCardStatus): boolean {
  return JOB_CARD_STATUS_TRANSITIONS[from].includes(to);
}
