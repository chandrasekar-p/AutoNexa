import type { WarrantyClaim } from './api-types';

/** The human-readable name of whatever original line a claim is raised against — same fallback order as the backend's own warrantyClaimsSummary. */
export function warrantyClaimOriginalLabel(claim: WarrantyClaim): string {
  if (claim.originalJobCardPart) return claim.originalJobCardPart.part.name;
  if (claim.originalJobCardLabour) {
    return claim.originalJobCardLabour.labourItem?.description ?? claim.originalJobCardLabour.description ?? 'Labour';
  }
  return 'Unknown';
}
