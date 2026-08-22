import { describe, expect, it } from 'vitest';
import { warrantyClaimOriginalLabel } from './warranty-claim-label';
import type { WarrantyClaim } from './api-types';

function claim(overrides: Partial<WarrantyClaim> = {}): WarrantyClaim {
  return {
    id: 'c1',
    claimJobCardId: 'jc1',
    claimJobCard: { id: 'jc1', jobCardNumber: 'JC-0002', vehicleId: 'v1', customerId: 'cust1' },
    originalJobCardPartId: null,
    originalJobCardPart: null,
    originalJobCardLabourId: null,
    originalJobCardLabour: null,
    status: 'OPEN',
    isBillable: true,
    resolutionNotes: null,
    approvedByUserId: null,
    approvedByUser: null,
    approvedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('warrantyClaimOriginalLabel', () => {
  it("uses the part's name when the claim is against a part line", () => {
    const c = claim({
      originalJobCardPartId: 'jcp1',
      originalJobCardPart: {
        id: 'jcp1',
        part: { id: 'p1', partNumber: 'BRK-001', name: 'Brake Pad Set' },
        jobCard: { id: 'jc0', jobCardNumber: 'JC-0001', actualDelivery: '2026-01-01T00:00:00.000Z', odometer: 10000 },
      },
    });
    expect(warrantyClaimOriginalLabel(c)).toBe('Brake Pad Set');
  });

  it('uses the catalogue labour item description when the labour line has no free-text override', () => {
    const c = claim({
      originalJobCardLabourId: 'jcl1',
      originalJobCardLabour: {
        id: 'jcl1',
        description: null,
        labourItem: { id: 'l1', code: 'LAB-01', description: 'Brake Service' },
        jobCard: { id: 'jc0', jobCardNumber: 'JC-0001', actualDelivery: '2026-01-01T00:00:00.000Z', odometer: 10000 },
      },
    });
    expect(warrantyClaimOriginalLabel(c)).toBe('Brake Service');
  });

  it("falls back to the labour line's own free-text description when there's no catalogue item", () => {
    const c = claim({
      originalJobCardLabourId: 'jcl1',
      originalJobCardLabour: {
        id: 'jcl1',
        description: 'Custom fabrication work',
        labourItem: null,
        jobCard: { id: 'jc0', jobCardNumber: 'JC-0001', actualDelivery: '2026-01-01T00:00:00.000Z', odometer: 10000 },
      },
    });
    expect(warrantyClaimOriginalLabel(c)).toBe('Custom fabrication work');
  });

  it('returns Unknown when neither original line is populated', () => {
    expect(warrantyClaimOriginalLabel(claim())).toBe('Unknown');
  });
});
