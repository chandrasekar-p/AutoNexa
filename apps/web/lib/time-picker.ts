export interface ParsedTime {
  hour12: number; // 1-12
  minute: number; // 0-59
  meridiem: 'AM' | 'PM';
}

const TIME_RE = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

/** Parses the app's "10:30 AM"-style free-text time string — falls back to 12:00 PM if it doesn't match, rather than throwing. */
export function parseTime(value: string): ParsedTime {
  const match = TIME_RE.exec(value.trim());
  if (!match) return { hour12: 12, minute: 0, meridiem: 'PM' };
  const hour12 = Math.min(12, Math.max(1, parseInt(match[1]!, 10) || 12));
  const minute = Math.min(59, Math.max(0, parseInt(match[2]!, 10) || 0));
  const meridiem = match[3]!.toUpperCase() === 'AM' ? 'AM' : 'PM';
  return { hour12, minute, meridiem };
}

export function formatTime({ hour12, minute, meridiem }: ParsedTime): string {
  return `${hour12}:${String(minute).padStart(2, '0')} ${meridiem}`;
}

/** Snaps a minute value to the nearest 5-minute dial position, for highlighting a value that didn't come from the dial itself (e.g. old free-typed data). */
export function nearestFive(minute: number): number {
  return (Math.round(minute / 5) * 5) % 60;
}
