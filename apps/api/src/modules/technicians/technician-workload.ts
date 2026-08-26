import { TechnicianStatus } from '@prisma/client';

export type TechnicianAvailability = 'AVAILABLE' | 'ON_JOB' | 'ON_LEAVE' | 'INACTIVE';

/**
 * The single source of truth for splitting ACTIVE technicians into
 * Available/On Job — used by the list, the availability badge, the KPI
 * summary, and the board columns, so none of them can ever disagree about
 * who counts as busy. Not a stored value: an ACTIVE technician with zero
 * open (non-terminal) job cards is Available, one job or more is On Job.
 */
export function deriveTechnicianAvailability(status: TechnicianStatus, jobsOpen: number): TechnicianAvailability {
  if (status === TechnicianStatus.ON_LEAVE) return 'ON_LEAVE';
  if (status === TechnicianStatus.INACTIVE) return 'INACTIVE';
  return jobsOpen > 0 ? 'ON_JOB' : 'AVAILABLE';
}

/** Clamped 0–100 — jobsOpen can exceed maxConcurrentJobs in practice (nothing stops over-assignment), so this never reports more than "full." */
export function computeWorkloadPercent(jobsOpen: number, maxConcurrentJobs: number): number {
  if (maxConcurrentJobs <= 0) return jobsOpen > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round((jobsOpen / maxConcurrentJobs) * 100)));
}
