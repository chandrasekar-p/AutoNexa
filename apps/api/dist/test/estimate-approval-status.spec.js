"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const estimate_approval_status_1 = require("../src/modules/estimates/estimate-approval-status");
describe('deriveEstimateApprovalStatus', () => {
    it('returns AWAITING_APPROVAL for a SENT estimate that was viewed', () => {
        expect((0, estimate_approval_status_1.deriveEstimateApprovalStatus)(client_1.EstimateStatus.SENT, true)).toBe('AWAITING_APPROVAL');
    });
    it('returns plain SENT for a SENT estimate that was not viewed', () => {
        expect((0, estimate_approval_status_1.deriveEstimateApprovalStatus)(client_1.EstimateStatus.SENT, false)).toBe(client_1.EstimateStatus.SENT);
    });
    it.each([client_1.EstimateStatus.DRAFT, client_1.EstimateStatus.APPROVED, client_1.EstimateStatus.REJECTED, client_1.EstimateStatus.EXPIRED, client_1.EstimateStatus.CONVERTED])('leaves %s unaffected even when wasViewed is true', (status) => {
        expect((0, estimate_approval_status_1.deriveEstimateApprovalStatus)(status, true)).toBe(status);
    });
});
//# sourceMappingURL=estimate-approval-status.spec.js.map