/**
 * Pure grouping/counting for GET /reports/comeback-rate — pulled out of
 * reports.service.ts so the aggregation itself is unit-testable without a
 * DB, same "extract pure logic, test that" convention as
 * sales-bucketing.ts/column-totals.ts. Returns raw counts, not a computed
 * percentage rate — same "counts, not a derived ratio" choice
 * jobCardStatus()'s groupBy already makes.
 */

export type ComebackGroupBy = 'technician' | 'part' | 'supplier';

export interface ComebackClaimInput {
  technicianId: string | null;
  technicianName: string | null;
  partId: string | null;
  partName: string | null;
  supplierId: string | null;
  supplierName: string | null;
}

export interface ComebackBucket {
  id: string;
  label: string;
  count: number;
}

export function aggregateComebackRate(claims: ComebackClaimInput[], groupBy: ComebackGroupBy): ComebackBucket[] {
  const buckets = new Map<string, { label: string; count: number }>();

  for (const claim of claims) {
    let key: string | null = null;
    let label = 'Unknown';

    if (groupBy === 'technician') {
      key = claim.technicianId;
      label = claim.technicianName ?? 'Unknown';
    } else if (groupBy === 'part') {
      key = claim.partId;
      label = claim.partName ?? 'Unknown';
    } else if (groupBy === 'supplier') {
      key = claim.supplierId;
      label = claim.supplierName ?? 'Unknown';
    }

    // A labour-only claim has no part/supplier angle, and a claim whose
    // original job card never had a technician assigned has no
    // technician angle — both are simply excluded from that grouping,
    // not force-bucketed into a misleading "Unknown".
    if (!key) continue;
    const existing = buckets.get(key) ?? { label, count: 0 };
    existing.count++;
    buckets.set(key, existing);
  }

  return [...buckets.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.count - a.count);
}
