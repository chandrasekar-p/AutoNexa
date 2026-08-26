import { JobCardStatus } from '@prisma/client';

/**
 * Fixed happy-path ordering used only to derive a "how far along is this
 * job" percentage — not a replacement for JOB_CARD_STATUS_TRANSITIONS,
 * which governs what moves are actually allowed. WAITING_PARTS shares
 * IN_PROGRESS's ordinal since it's a lateral branch (repair paused, not
 * further along), not forward motion. CANCELLED has no position — a
 * cancelled job was never "N% of the way to delivered."
 */
const PIPELINE_ORDER: JobCardStatus[] = [
  JobCardStatus.OPEN,
  JobCardStatus.DIAGNOSIS,
  JobCardStatus.WAITING_APPROVAL,
  JobCardStatus.APPROVED,
  JobCardStatus.IN_PROGRESS,
  JobCardStatus.QUALITY_CHECK,
  JobCardStatus.READY_FOR_DELIVERY,
  JobCardStatus.DELIVERED,
];

/** Statuses where showing a progress bar is actually useful — active repair, not the pre-approval paperwork stages. */
export const JOB_CARD_ACTIVE_PROGRESS_STATUSES: JobCardStatus[] = [
  JobCardStatus.IN_PROGRESS,
  JobCardStatus.WAITING_PARTS,
  JobCardStatus.QUALITY_CHECK,
];

export function computeJobCardPipelineProgress(status: JobCardStatus): number | null {
  if (status === JobCardStatus.CANCELLED) return null;
  const effectiveStatus = status === JobCardStatus.WAITING_PARTS ? JobCardStatus.IN_PROGRESS : status;
  const index = PIPELINE_ORDER.indexOf(effectiveStatus);
  if (index === -1) return null;
  return Math.round(((index + 1) / PIPELINE_ORDER.length) * 100);
}
