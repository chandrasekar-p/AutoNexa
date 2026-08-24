import { WarrantyClaimStatus } from '@prisma/client';
import {
  WARRANTY_CLAIM_STATUS_TRANSITIONS,
  isValidWarrantyClaimTransition,
} from '../src/modules/warranty/warranty-claim-status-transitions';

describe('isValidWarrantyClaimTransition', () => {
  it('allows the decision step from OPEN', () => {
    expect(isValidWarrantyClaimTransition(WarrantyClaimStatus.OPEN, WarrantyClaimStatus.APPROVED)).toBe(true);
    expect(isValidWarrantyClaimTransition(WarrantyClaimStatus.OPEN, WarrantyClaimStatus.REJECTED)).toBe(true);
  });

  it('allows closing out a decided claim as RESOLVED, from either decision', () => {
    expect(isValidWarrantyClaimTransition(WarrantyClaimStatus.APPROVED, WarrantyClaimStatus.RESOLVED)).toBe(true);
    expect(isValidWarrantyClaimTransition(WarrantyClaimStatus.REJECTED, WarrantyClaimStatus.RESOLVED)).toBe(true);
  });

  it('rejects flipping an already-decided claim to the opposite decision', () => {
    expect(isValidWarrantyClaimTransition(WarrantyClaimStatus.APPROVED, WarrantyClaimStatus.REJECTED)).toBe(false);
    expect(isValidWarrantyClaimTransition(WarrantyClaimStatus.REJECTED, WarrantyClaimStatus.APPROVED)).toBe(false);
  });

  it('rejects re-deciding a claim back to OPEN from any state', () => {
    expect(isValidWarrantyClaimTransition(WarrantyClaimStatus.APPROVED, WarrantyClaimStatus.OPEN)).toBe(false);
    expect(isValidWarrantyClaimTransition(WarrantyClaimStatus.REJECTED, WarrantyClaimStatus.OPEN)).toBe(false);
    expect(isValidWarrantyClaimTransition(WarrantyClaimStatus.RESOLVED, WarrantyClaimStatus.OPEN)).toBe(false);
  });

  it('treats RESOLVED as terminal — zero allowed transitions out', () => {
    expect(WARRANTY_CLAIM_STATUS_TRANSITIONS[WarrantyClaimStatus.RESOLVED]).toHaveLength(0);
    for (const to of Object.values(WarrantyClaimStatus)) {
      expect(isValidWarrantyClaimTransition(WarrantyClaimStatus.RESOLVED, to)).toBe(false);
    }
  });

  it('rejects transitioning into OPEN from anywhere — it is only ever the initial state', () => {
    for (const from of Object.values(WarrantyClaimStatus)) {
      expect(isValidWarrantyClaimTransition(from, WarrantyClaimStatus.OPEN)).toBe(false);
    }
  });
});
