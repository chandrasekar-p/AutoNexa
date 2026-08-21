/**
 * Client-side fallback for the report table's "Total" footer row — used
 * only when the API response has no server-computed `columnTotals` (see
 * apps/api's column-totals.ts). Safe here only because it sums whatever
 * rows are actually in the response; for a paginated report where the
 * backend already truncated to one page, the backend's own columnTotals
 * (computed over the full dataset before slicing) is used instead — this
 * fallback exists for the one report that returns its full, unpaginated
 * dataset with no columnTotals field of its own (job-card-status, which
 * must keep its bare-array shape for the dashboard's donut chart).
 */
export function computeColumnTotals(rows: Record<string, unknown>[]): Record<string, number> {
  if (rows.length === 0) return {};

  const keys = Object.keys(rows[0]!).filter((k) => k !== 'id');
  const totals: Record<string, number> = {};

  for (const key of keys) {
    const numericValues = rows.map((row) => toNumeric(row[key]));
    if (numericValues.some((v) => v === null)) continue;
    totals[key] = numericValues.reduce<number>((sum, v) => sum + (v as number), 0);
  }

  return totals;
}

function toNumeric(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
  return null;
}
