/**
 * Pure "is the workshop open right now" check — computed client-side, not
 * server-side, since it needs to reflect the viewer's current moment on
 * every page (sidebar + topbar), not just a value baked into one API
 * response. Same "no per-tenant timezone-aware date math" simplification
 * already documented on the backend's dashboard.service.ts — this compares
 * against the browser's local time, not TenantSettings.timezone.
 */
export interface WorkshopHoursStatus {
  isOpen: boolean;
  hoursLabel: string; // "09:00 AM – 07:00 PM"
}

function to12Hour(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h! >= 12 ? 'PM' : 'AM';
  const hour12 = h! % 12 === 0 ? 12 : h! % 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

function minutesSinceMidnight(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h! * 60 + m!;
}

/**
 * Returns null (not a status) when either hour isn't set — TenantSettings
 * defaults to no business hours at all, and the caller should simply not
 * render an indicator rather than guessing "closed" for a workshop that
 * never configured this.
 */
export function getWorkshopHoursStatus(open: string | null | undefined, close: string | null | undefined, now: Date = new Date()): WorkshopHoursStatus | null {
  if (!open || !close) return null;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = minutesSinceMidnight(open);
  const closeMinutes = minutesSinceMidnight(close);

  // Overnight hours (close time earlier than open time, e.g. open 18:00,
  // close 02:00) — open if we're after opening OR still before closing.
  const isOpen =
    openMinutes <= closeMinutes ? nowMinutes >= openMinutes && nowMinutes < closeMinutes : nowMinutes >= openMinutes || nowMinutes < closeMinutes;

  return { isOpen, hoursLabel: `${to12Hour(open)} – ${to12Hour(close)}` };
}
