/**
 * Pure "when is this vehicle's next service due" rule, kept free of any
 * Prisma/IO so it's trivially unit-testable — see
 * test/next-service-due.spec.ts. reminder-cron.service.ts is responsible
 * for fetching the inputs (the vehicle's last DELIVERED job card, its
 * current odometerReading, the applicable interval) and acting on the
 * result.
 */

export interface LastService {
  /** JobCard.actualDelivery of the vehicle's most recent DELIVERED job card. */
  completedAt: Date;
  /** JobCard.odometer at that job card — the reading at time of service, not the vehicle's current one. */
  odometer: number | null;
}

export interface ServiceDueResult {
  /** Null when there's no service history to compute from at all. */
  dueDate: Date | null;
  /**
   * True once currentOdometer has already crossed lastService.odometer +
   * intervalKm. Unlike dueDate, this has no "N days before" concept — there's
   * no mileage-per-day rate to project from, so it's a binary
   * already-happened check, computed fresh each run.
   */
  dueByOdometer: boolean;
}

/**
 * `lastService: null` (no completed job card yet) yields no due date at all
 * — nothing to base one on. `currentOdometer: null` (Vehicle.odometerReading
 * never set) or `lastService.odometer: null` (this job card didn't record
 * one) skips the odometer trigger rather than guessing; the date trigger is
 * unaffected either way.
 */
export function computeServiceDue(lastService: LastService | null, currentOdometer: number | null, intervalMonths: number, intervalKm: number): ServiceDueResult {
  if (!lastService) {
    return { dueDate: null, dueByOdometer: false };
  }

  const dueDate = new Date(lastService.completedAt);
  dueDate.setMonth(dueDate.getMonth() + intervalMonths);

  const dueByOdometer =
    currentOdometer !== null && lastService.odometer !== null && currentOdometer - lastService.odometer >= intervalKm;

  return { dueDate, dueByOdometer };
}
