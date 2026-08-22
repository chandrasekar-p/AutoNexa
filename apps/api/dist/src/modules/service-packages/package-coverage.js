"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLabourCoveredByPackage = isLabourCoveredByPackage;
exports.isPartCoveredByPackage = isPartCoveredByPackage;
function isLabourCoveredByPackage(labourItemId, inclusions) {
    return labourItemId !== null && inclusions.labourItemIds.has(labourItemId);
}
function isPartCoveredByPackage(partId, partCategoryId, inclusions) {
    return inclusions.partIds.has(partId) || (partCategoryId !== null && inclusions.partCategoryIds.has(partCategoryId));
}
//# sourceMappingURL=package-coverage.js.map