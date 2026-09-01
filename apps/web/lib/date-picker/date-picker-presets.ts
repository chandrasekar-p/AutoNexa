export type DatePickerPresetKey = 'today' | 'tomorrow' | 'thisWeek' | 'nextWeek' | 'thisMonth' | 'nextMonth';

export interface DatePickerPreset {
  key: DatePickerPresetKey;
  label: string;
}

export const DATE_PICKER_PRESETS: DatePickerPreset[] = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'nextWeek', label: 'Next Week' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'nextMonth', label: 'Next Month' },
];

export interface DatePickerPresetResult {
  /** Set only for a preset that denotes one specific day (today/tomorrow) — the calendar should select this exact date. Null for a period-shaped preset ("this week"/"this month"), which only navigates the calendar view; a week or a month isn't itself a single date. */
  date: string | null;
  /** The month the calendar should be showing after this preset — 0-indexed, matches Date#getMonth(). */
  year: number;
  month: number;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Resolves a preset to a target day (if any) and the month the calendar
 * should navigate to — pure and clock-injectable, same testable shape as
 * lib/reports/date-range-presets.ts. Deliberately uses **local** calendar
 * arithmetic (plain getFullYear/getMonth/getDate), not that file's/
 * lib/attendance/this-week-range.ts's Date.UTC math — those exist to build
 * backend query ranges; this is a calendar the user is looking at and
 * clicking, so it should reflect their own local "today," not a
 * UTC-shifted one.
 */
export function resolveDatePickerPreset(key: DatePickerPresetKey, now: Date = new Date()): DatePickerPresetResult {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (key) {
    case 'today':
      return { date: toISODate(today), year: today.getFullYear(), month: today.getMonth() };
    case 'tomorrow': {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { date: toISODate(tomorrow), year: tomorrow.getFullYear(), month: tomorrow.getMonth() };
    }
    case 'thisWeek':
      return { date: null, year: today.getFullYear(), month: today.getMonth() };
    case 'nextWeek': {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return { date: null, year: nextWeek.getFullYear(), month: nextWeek.getMonth() };
    }
    case 'thisMonth':
      return { date: null, year: today.getFullYear(), month: today.getMonth() };
    case 'nextMonth': {
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return { date: null, year: nextMonth.getFullYear(), month: nextMonth.getMonth() };
    }
  }
}
