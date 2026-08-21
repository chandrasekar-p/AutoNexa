/**
 * Money fields arrive from the API as strings (see api-types.ts) — this is
 * the one place that parses one for display. Never do arithmetic on the
 * parsed value client-side; the backend is the source of truth for every
 * total (see the README's snapshot-pricing/server-computed-totals notes).
 */
export function formatMoney(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

/** Weekday + full date, e.g. "Saturday, 22 August 2026" — for headers/greetings, not table cells (use formatDate there). */
export function formatFullDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

export function formatTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).format(d);
}

export function daysUntil(value: string | Date): number {
  const d = typeof value === 'string' ? new Date(value) : value;
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((d.getTime() - now.getTime()) / msPerDay);
}

/** "Ravi Tech" -> "RT", "Madonna" -> "MA" — same rule UserMenu's own avatar circle uses. */
export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}
