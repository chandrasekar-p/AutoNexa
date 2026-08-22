"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasVisitsRemaining = hasVisitsRemaining;
exports.isPackageValidNow = isPackageValidNow;
exports.isPackageRedeemable = isPackageRedeemable;
const client_1 = require("@prisma/client");
function hasVisitsRemaining(visitsUsed, visitLimit) {
    return visitLimit === null || visitsUsed < visitLimit;
}
function isPackageValidNow(status, endDate, now = new Date()) {
    return status === client_1.CustomerPackageStatus.ACTIVE && endDate.getTime() >= now.getTime();
}
function isPackageRedeemable(status, endDate, visitsUsed, visitLimit, now = new Date()) {
    return isPackageValidNow(status, endDate, now) && hasVisitsRemaining(visitsUsed, visitLimit);
}
//# sourceMappingURL=package-eligibility.js.map