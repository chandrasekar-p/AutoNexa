import { EstimateStatus } from '@prisma/client';
import { deriveEstimateApprovalStatus } from '../src/modules/estimates/estimate-approval-status';

describe('deriveEstimateApprovalStatus', () => {
  it('returns AWAITING_APPROVAL for a SENT estimate that was viewed', () => {
    expect(deriveEstimateApprovalStatus(EstimateStatus.SENT, true)).toBe('AWAITING_APPROVAL');
  });

  it('returns plain SENT for a SENT estimate that was not viewed', () => {
    expect(deriveEstimateApprovalStatus(EstimateStatus.SENT, false)).toBe(EstimateStatus.SENT);
  });

  it.each([EstimateStatus.DRAFT, EstimateStatus.APPROVED, EstimateStatus.REJECTED, EstimateStatus.EXPIRED, EstimateStatus.CONVERTED])(
    'leaves %s unaffected even when wasViewed is true',
    (status) => {
      expect(deriveEstimateApprovalStatus(status, true)).toBe(status);
    },
  );
});
