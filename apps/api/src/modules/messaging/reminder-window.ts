/**
 * The [start, end) UTC day boundary for "leadDays days from now" — used
 * directly as an `appointmentDate: { gte: start, lt: end }` Prisma filter
 * by the daily reminder cron (see reminder-cron.service.ts).
 *
 * Deliberately date-only: `appointmentTime` is a free-form display string
 * (e.g. "10:30 AM", see CreateAppointmentDto), not something safe to parse
 * for exact-hour scheduling, so reminders fire once a day for "tomorrow's"
 * appointments rather than N hours before an exact time.
 */
export function dailyReminderWindow(now: Date, leadDays = 1): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + leadDays));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + leadDays + 1));
  return { start, end };
}
