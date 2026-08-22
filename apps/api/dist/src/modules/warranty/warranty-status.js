"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeWarrantyStatus = computeWarrantyStatus;
function computeWarrantyStatus(deliveredAt, warrantyMonths, warrantyKm, odometerAtService, currentOdometer, now = new Date()) {
    if (!deliveredAt || (warrantyMonths === null && warrantyKm === null)) {
        return { expiresAt: null, expiredByKm: false, isActive: false };
    }
    let expiresAt = null;
    if (warrantyMonths !== null) {
        expiresAt = new Date(deliveredAt);
        expiresAt.setMonth(expiresAt.getMonth() + warrantyMonths);
    }
    const expiredByKm = warrantyKm !== null && odometerAtService !== null && currentOdometer !== null && currentOdometer - odometerAtService >= warrantyKm;
    const expiredByDate = expiresAt !== null && expiresAt.getTime() < now.getTime();
    return { expiresAt, expiredByKm, isActive: !expiredByDate && !expiredByKm };
}
//# sourceMappingURL=warranty-status.js.map