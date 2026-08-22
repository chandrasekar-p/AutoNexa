/**
 * Pure "is this job-card line still under warranty" rule — same
 * "months or km, whichever comes first" shape as
 * messaging/next-service-due.ts's computeServiceDue, and the same
 * "compute on read, never persist a derived expiry column" choice: a
 * line's warranty can't be dated until the vehicle is actually delivered
 * (JobCard.actualDelivery), which happens strictly after the line is
 * added, so there's nothing sensible to store at add-time.
 */

export interface WarrantyStatusResult {
  /** Null when there's nothing to compute from (not yet delivered, or no warranty was offered on this line at all). */
  expiresAt: Date | null;
  /** True once currentOdometer has already crossed odometerAtService + warrantyKm — a binary already-happened check, same reasoning as next-service-due.ts's dueByOdometer (no mileage-per-day rate to project a countdown from). */
  expiredByKm: boolean;
  /** The one field callers actually branch on — false whenever EITHER expiresAt has passed OR expiredByKm is true. */
  isActive: boolean;
}

export function computeWarrantyStatus(
  deliveredAt: Date | null,
  warrantyMonths: number | null,
  warrantyKm: number | null,
  odometerAtService: number | null,
  currentOdometer: number | null,
  now: Date = new Date(),
): WarrantyStatusResult {
  if (!deliveredAt || (warrantyMonths === null && warrantyKm === null)) {
    return { expiresAt: null, expiredByKm: false, isActive: false };
  }

  let expiresAt: Date | null = null;
  if (warrantyMonths !== null) {
    expiresAt = new Date(deliveredAt);
    expiresAt.setMonth(expiresAt.getMonth() + warrantyMonths);
  }

  const expiredByKm =
    warrantyKm !== null && odometerAtService !== null && currentOdometer !== null && currentOdometer - odometerAtService >= warrantyKm;

  const expiredByDate = expiresAt !== null && expiresAt.getTime() < now.getTime();

  return { expiresAt, expiredByKm, isActive: !expiredByDate && !expiredByKm };
}
