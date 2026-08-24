export type DateRangePresetKey = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'custom';

export interface DateRangePreset {
  key: DateRangePresetKey;
  label: string;
}

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: 'Last 7 Days' },
  { key: 'last30', label: 'Last 30 Days' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'custom', label: 'Custom' },
];

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Resolves a preset key to a concrete `{from, to}` (both "YYYY-MM-DD",
 * inclusive) as of `now` — pure and clock-injectable so it's unit-testable
 * without faking the system clock. Returns `null` for 'custom', which
 * means "use whatever the user typed into the From/To inputs directly"
 * rather than a computed range.
 */
export function resolveDateRangePreset(key: DateRangePresetKey, now: Date = new Date()): { from: string; to: string } | null {
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  switch (key) {
    case 'today':
      return { from: toISODate(todayStart), to: toISODate(todayStart) };
    case 'yesterday': {
      const yesterday = new Date(todayStart);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      return { from: toISODate(yesterday), to: toISODate(yesterday) };
    }
    case 'last7': {
      const from = new Date(todayStart);
      from.setUTCDate(from.getUTCDate() - 6);
      return { from: toISODate(from), to: toISODate(todayStart) };
    }
    case 'last30': {
      const from = new Date(todayStart);
      from.setUTCDate(from.getUTCDate() - 29);
      return { from: toISODate(from), to: toISODate(todayStart) };
    }
    case 'thisMonth': {
      const from = new Date(Date.UTC(todayStart.getUTCFullYear(), todayStart.getUTCMonth(), 1));
      return { from: toISODate(from), to: toISODate(todayStart) };
    }
    case 'lastMonth': {
      const from = new Date(Date.UTC(todayStart.getUTCFullYear(), todayStart.getUTCMonth() - 1, 1));
      const to = new Date(Date.UTC(todayStart.getUTCFullYear(), todayStart.getUTCMonth(), 0));
      return { from: toISODate(from), to: toISODate(to) };
    }
    case 'custom':
      return null;
  }
}
