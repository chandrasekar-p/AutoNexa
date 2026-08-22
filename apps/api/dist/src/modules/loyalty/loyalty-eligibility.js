"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasSufficientPoints = hasSufficientPoints;
exports.computePointsEarned = computePointsEarned;
exports.computeRedemptionValue = computeRedemptionValue;
const client_1 = require("@prisma/client");
function hasSufficientPoints(balance, requested) {
    return requested >= 0 && requested <= balance;
}
function computePointsEarned(subtotal, pointsPerRupee) {
    return new client_1.Prisma.Decimal(subtotal).mul(pointsPerRupee).floor().toNumber();
}
function computeRedemptionValue(points, pointValueRupees) {
    return new client_1.Prisma.Decimal(points).mul(pointValueRupees).toDecimalPlaces(2);
}
//# sourceMappingURL=loyalty-eligibility.js.map