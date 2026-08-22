/**
 * Whether a job-card line should be excluded from invoicing because it's
 * the (non-billable) fix for an open/approved warranty claim. Unlike
 * service-packages/package-coverage.ts, this can't be derived from a
 * template match — a technician explicitly tags which new line fixes
 * which claim (JobCardLabour/JobCardPart.warrantyClaimId) — so this is
 * just a lookup, not a matching algorithm. Kept as its own pure function
 * anyway so the "free vs billed" decision is one documented, tested rule
 * rather than inlined in invoices.service.ts.
 */
export function isLineFreeUnderWarrantyClaim(warrantyClaimId: string | null, isBillableByClaimId: Map<string, boolean>): boolean {
  if (!warrantyClaimId) return false;
  const isBillable = isBillableByClaimId.get(warrantyClaimId);
  return isBillable === false;
}
