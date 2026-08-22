/**
 * Pure decision/key-building logic for the recurring reminder cron
 * (insurance/PUC expiry, service-due) — kept free of Prisma so the
 * "fires once per threshold crossing" and "opt-out/tenant-toggle
 * suppresses" rules are unit-testable without a mocked DB client. See
 * test/reminder-eligibility.spec.ts. reminder-cron.service.ts does the
 * fetching/sending; this module only decides.
 */

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Keys a specific threshold crossing of a specific expiry/due date. A new
 * date (renewal, or a recomputed service-due date after a new service)
 * produces a new key, so the reminder cycle can fire again — see
 * DeliveryLog.dedupeKey's doc comment for why this is necessary instead of
 * deduping on the entity id alone. `entityId` is a vehicle id for
 * insurance/PUC/serviceDue, a CustomerServicePackage id for packageExpiry.
 */
export function buildDateDedupeKey(entityId: string, field: 'insuranceExpiry' | 'pucExpiry' | 'serviceDue' | 'packageExpiry', date: Date, thresholdDays: number): string {
  return `${entityId}:${field}:${isoDate(date)}:${thresholdDays}d`;
}

/**
 * Keys the odometer-based service-due trigger to the odometer reading at
 * the vehicle's last completed service — only a new service (which resets
 * that baseline) lets this fire again.
 */
export function buildOdometerDedupeKey(vehicleId: string, lastServiceOdometer: number): string {
  return `${vehicleId}:odometer:${lastServiceOdometer}`;
}

export interface DateReminderEligibilityInput {
  optedOut: boolean;
  enabled: boolean;
  now: Date;
  targetDate: Date;
  thresholdDays: number;
  alreadySent: boolean;
}

/**
 * True once `targetDate` (an expiry or a computed service-due date) falls
 * within `thresholdDays` of now — a cumulative "at or under N days out"
 * check, not an exact-day bucket, so a cron that misses a day still catches
 * up on the next run instead of silently skipping that vehicle forever.
 * Already-past dates are excluded — this is a heads-up, not a "you're
 * overdue" escalation (out of scope here).
 */
export function shouldSendDateReminder(input: DateReminderEligibilityInput): boolean {
  if (input.optedOut || !input.enabled || input.alreadySent) return false;
  if (input.targetDate <= input.now) return false;
  const horizon = new Date(input.now.getTime() + input.thresholdDays * 24 * 60 * 60 * 1000);
  return input.targetDate <= horizon;
}

export interface OdometerReminderEligibilityInput {
  optedOut: boolean;
  enabled: boolean;
  dueByOdometer: boolean;
  alreadySent: boolean;
}

export function shouldSendOdometerReminder(input: OdometerReminderEligibilityInput): boolean {
  return input.dueByOdometer && input.enabled && !input.optedOut && !input.alreadySent;
}
