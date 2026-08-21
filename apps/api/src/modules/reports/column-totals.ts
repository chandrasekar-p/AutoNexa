/**
 * Sums every column that is numeric across every row — used to build a
 * "Grand Total" footer row for report tables. Must run over the FULL row
 * set before pagination slices it down to one page, or the total would
 * silently under-count whenever a report has more rows than fit on a
 * page (see reports.service.ts's paginate()) — a wrong total is worse
 * than no total on a finance-adjacent report.
 *
 * A column only gets a total if every row has a numeric value for it —
 * a column that's numeric in some rows and null/text in others (or a
 * nested object like `customer: {id, name}`) is left out rather than
 * partially summed.
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

/** Handles plain numbers and Prisma.Decimal instances (duck-typed to avoid a hard @prisma/client dependency in this pure module) — everything else (strings, dates, nested objects, null) is "not summable." */
function toNumeric(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value && typeof (value as { toNumber?: unknown }).toNumber === 'function') {
    return (value as { toNumber: () => number }).toNumber();
  }
  return null;
}
