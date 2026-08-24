import { WarrantyClaimStatus } from '@prisma/client';

/**
 * Explicit allowed-transitions map, same shape/discipline as
 * job-card-status-transitions.ts. OPEN is the only entry point (never a
 * transition target); APPROVED/REJECTED are the decision step and can't be
 * reversed into each other directly — a wrong decision needs a fresh look
 * at RESOLVED, not a silent flip. RESOLVED is terminal: a claim's decision
 * doesn't get reopened once resolved.
 */
export const WARRANTY_CLAIM_STATUS_TRANSITIONS: Record<WarrantyClaimStatus, WarrantyClaimStatus[]> = {
  [WarrantyClaimStatus.OPEN]: [WarrantyClaimStatus.APPROVED, WarrantyClaimStatus.REJECTED],
  [WarrantyClaimStatus.APPROVED]: [WarrantyClaimStatus.RESOLVED],
  [WarrantyClaimStatus.REJECTED]: [WarrantyClaimStatus.RESOLVED],
  [WarrantyClaimStatus.RESOLVED]: [],
};

export function isValidWarrantyClaimTransition(from: WarrantyClaimStatus, to: WarrantyClaimStatus): boolean {
  return WARRANTY_CLAIM_STATUS_TRANSITIONS[from].includes(to);
}
