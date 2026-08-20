/**
 * Today's date at UTC midnight — matches the `@db.Date` column's storage
 * (date-only, no time-of-day), same convention as Appointment.appointmentDate
 * elsewhere in this codebase. Pure so both the clock-in/out service methods
 * and their tests share one definition of "today".
 */
export function todayDateOnly(now: Date = new Date()): Date {
  return dateOnly(now);
}

/** Strips the time-of-day off an arbitrary Date, keeping the calendar day at UTC midnight. */
export function dateOnly(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}
