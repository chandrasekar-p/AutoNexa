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

export function formatDurationMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

/** "Just now" / "5m ago" / "3h ago" / "2d ago" — for compact timestamps like a Kanban card's "Created X ago", not a substitute for formatDate on anything meant to be precise. */
export function formatRelativeTimeAgo(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  const minutes = Math.floor((Date.now() - d.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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
