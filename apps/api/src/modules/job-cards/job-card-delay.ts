import { JobCardStatus } from '@prisma/client';

export type JobCardDelayStatus = 'ON_TRACK' | 'DUE_TODAY' | 'DELAYED';

const TERMINAL_STATUSES: JobCardStatus[] = [JobCardStatus.DELIVERED, JobCardStatus.CANCELLED];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Purely derived from expectedDelivery vs. now — no stored "is this
 * delayed" flag, same computed-on-every-read philosophy as
 * computeWarrantyStatus/computeServiceDue. Null (not applicable) once a
 * job card is DELIVERED/CANCELLED, or if no expectedDelivery was ever set
 * (nothing to be late against).
 */
export function computeJobCardDelayStatus(
  expectedDelivery: Date | null,
  status: JobCardStatus,
  now: Date = new Date(),
): JobCardDelayStatus | null {
  if (!expectedDelivery || TERMINAL_STATUSES.includes(status)) return null;
  const today = startOfDay(now);
  const dueDay = startOfDay(expectedDelivery);
  if (dueDay.getTime() < today.getTime()) return 'DELAYED';
  if (dueDay.getTime() === today.getTime()) return 'DUE_TODAY';
  return 'ON_TRACK';
}

/** Whole calendar days past the expected delivery date — only meaningful when computeJobCardDelayStatus returned 'DELAYED'. */
export function computeJobCardDelayDays(expectedDelivery: Date, now: Date = new Date()): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((startOfDay(now).getTime() - startOfDay(expectedDelivery).getTime()) / msPerDay));
}
