/**
 * Whether a specific job-card line is covered "for free" by a redeemed
 * package. Deliberately DERIVED, not stored per-line on JobCardLabour/
 * JobCardPart — see JobCard.redeemedPackageId's schema doc comment for
 * why a stored per-line flag would risk going stale. Pure and DB-free;
 * callers (job-cards.service.ts, invoices.service.ts) build the
 * PackageInclusions set once per job card from the three
 * ServicePackage*Item join tables, then call this per line.
 */
export interface PackageInclusions {
  labourItemIds: Set<string>;
  partIds: Set<string>;
  partCategoryIds: Set<string>;
}

export function isLabourCoveredByPackage(labourItemId: string | null, inclusions: PackageInclusions): boolean {
  return labourItemId !== null && inclusions.labourItemIds.has(labourItemId);
}

export function isPartCoveredByPackage(partId: string, partCategoryId: string | null, inclusions: PackageInclusions): boolean {
  return inclusions.partIds.has(partId) || (partCategoryId !== null && inclusions.partCategoryIds.has(partCategoryId));
}
