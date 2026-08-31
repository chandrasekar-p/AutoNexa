function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Monday-of-this-week through today (inclusive), both "YYYY-MM-DD" — the
 * one quick-date preset the Attendance filter bar needs that
 * `lib/reports/date-range-presets.ts` doesn't have. Kept separate rather
 * than adding a `thisWeek` case there, since that file's preset list also
 * drives the Reports page's own button row — adding a case there would
 * leak a new button onto an unrelated page.
 */
export function resolveThisWeekRange(now: Date = new Date()): { from: string; to: string } {
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayOfWeek = todayStart.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(todayStart);
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
  return { from: toISODate(monday), to: toISODate(todayStart) };
}
