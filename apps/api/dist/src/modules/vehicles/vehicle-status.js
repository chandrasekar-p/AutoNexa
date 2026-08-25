"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeExpiryStatus = computeExpiryStatus;
exports.computeVehicleStatus = computeVehicleStatus;
function computeExpiryStatus(expiry, now = new Date(), soonDays = 30) {
    if (!expiry)
        return 'not_set';
    if (expiry.getTime() < now.getTime())
        return 'expired';
    const soonThreshold = new Date(now.getTime() + soonDays * 24 * 60 * 60 * 1000);
    if (expiry.getTime() <= soonThreshold.getTime())
        return 'expiring_soon';
    return 'active';
}
function computeVehicleStatus(insuranceExpiry, pucExpiry, now = new Date()) {
    const insurance = computeExpiryStatus(insuranceExpiry, now);
    const puc = computeExpiryStatus(pucExpiry, now);
    if (insurance === 'not_set' && puc === 'not_set')
        return 'NO_DATA';
    if (insurance === 'expired' || puc === 'expired')
        return 'EXPIRED';
    return 'ACTIVE';
}
//# sourceMappingURL=vehicle-status.js.map