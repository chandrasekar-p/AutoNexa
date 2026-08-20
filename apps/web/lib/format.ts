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

export function daysUntil(value: string | Date): number {
  const d = typeof value === 'string' ? new Date(value) : value;
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((d.getTime() - now.getTime()) / msPerDay);
}
