"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveEstimateApprovalStatus = deriveEstimateApprovalStatus;
const client_1 = require("@prisma/client");
function deriveEstimateApprovalStatus(status, wasViewed) {
    if (status !== client_1.EstimateStatus.SENT)
        return status;
    return wasViewed ? 'AWAITING_APPROVAL' : status;
}
//# sourceMappingURL=estimate-approval-status.js.map