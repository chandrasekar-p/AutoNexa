"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WARRANTY_CLAIM_STATUS_TRANSITIONS = void 0;
exports.isValidWarrantyClaimTransition = isValidWarrantyClaimTransition;
const client_1 = require("@prisma/client");
exports.WARRANTY_CLAIM_STATUS_TRANSITIONS = {
    [client_1.WarrantyClaimStatus.OPEN]: [client_1.WarrantyClaimStatus.APPROVED, client_1.WarrantyClaimStatus.REJECTED],
    [client_1.WarrantyClaimStatus.APPROVED]: [client_1.WarrantyClaimStatus.RESOLVED],
    [client_1.WarrantyClaimStatus.REJECTED]: [client_1.WarrantyClaimStatus.RESOLVED],
    [client_1.WarrantyClaimStatus.RESOLVED]: [],
};
function isValidWarrantyClaimTransition(from, to) {
    return exports.WARRANTY_CLAIM_STATUS_TRANSITIONS[from].includes(to);
}
//# sourceMappingURL=warranty-claim-status-transitions.js.map