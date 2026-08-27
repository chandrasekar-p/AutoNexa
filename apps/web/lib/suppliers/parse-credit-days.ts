/**
 * `paymentTerms` is a free-text string on the backend (no dedicated
 * creditDays column) — this derives a display-only number from it for the
 * table's "Credit Days" column, matching the "Net 30"-shaped values the
 * form itself writes. Returns null for anything that doesn't parse (blank,
 * or a custom string that isn't "Net N"), never a guessed default.
 */
export function parseCreditDays(paymentTerms: string | null | undefined): number | null {
  if (!paymentTerms) return null;
  const match = /net\s*(\d+)/i.exec(paymentTerms);
  return match ? Number(match[1]) : null;
}
