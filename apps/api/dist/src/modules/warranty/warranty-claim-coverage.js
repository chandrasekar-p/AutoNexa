"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLineFreeUnderWarrantyClaim = isLineFreeUnderWarrantyClaim;
function isLineFreeUnderWarrantyClaim(warrantyClaimId, isBillableByClaimId) {
    if (!warrantyClaimId)
        return false;
    const isBillable = isBillableByClaimId.get(warrantyClaimId);
    return isBillable === false;
}
//# sourceMappingURL=warranty-claim-coverage.js.map