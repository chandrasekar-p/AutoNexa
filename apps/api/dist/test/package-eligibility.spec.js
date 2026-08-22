"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const package_eligibility_1 = require("../src/modules/service-packages/package-eligibility");
describe('hasVisitsRemaining', () => {
    it('always allows an unlimited-visit package (visitLimit null)', () => {
        expect((0, package_eligibility_1.hasVisitsRemaining)(0, null)).toBe(true);
        expect((0, package_eligibility_1.hasVisitsRemaining)(999, null)).toBe(true);
    });
    it('allows a request below the visit limit', () => {
        expect((0, package_eligibility_1.hasVisitsRemaining)(2, 4)).toBe(true);
    });
    it('rejects once visitsUsed reaches the limit', () => {
        expect((0, package_eligibility_1.hasVisitsRemaining)(4, 4)).toBe(false);
    });
    it('rejects once visitsUsed exceeds the limit', () => {
        expect((0, package_eligibility_1.hasVisitsRemaining)(5, 4)).toBe(false);
    });
});
describe('isPackageValidNow', () => {
    const now = new Date('2026-06-15T00:00:00.000Z');
    it('is valid while ACTIVE and not yet past endDate', () => {
        expect((0, package_eligibility_1.isPackageValidNow)(client_1.CustomerPackageStatus.ACTIVE, new Date('2026-12-31'), now)).toBe(true);
    });
    it('is invalid once past endDate, even if still marked ACTIVE', () => {
        expect((0, package_eligibility_1.isPackageValidNow)(client_1.CustomerPackageStatus.ACTIVE, new Date('2026-01-01'), now)).toBe(false);
    });
    it('is invalid when CANCELLED, regardless of endDate', () => {
        expect((0, package_eligibility_1.isPackageValidNow)(client_1.CustomerPackageStatus.CANCELLED, new Date('2026-12-31'), now)).toBe(false);
    });
    it('is invalid when EXPIRED', () => {
        expect((0, package_eligibility_1.isPackageValidNow)(client_1.CustomerPackageStatus.EXPIRED, new Date('2026-12-31'), now)).toBe(false);
    });
});
describe('isPackageRedeemable', () => {
    const now = new Date('2026-06-15T00:00:00.000Z');
    it('is redeemable when active, unexpired, and visits remain', () => {
        expect((0, package_eligibility_1.isPackageRedeemable)(client_1.CustomerPackageStatus.ACTIVE, new Date('2026-12-31'), 2, 4, now)).toBe(true);
    });
    it('is not redeemable once visits are exhausted, even if still time-valid', () => {
        expect((0, package_eligibility_1.isPackageRedeemable)(client_1.CustomerPackageStatus.ACTIVE, new Date('2026-12-31'), 4, 4, now)).toBe(false);
    });
    it('is not redeemable once expired, even with visits remaining', () => {
        expect((0, package_eligibility_1.isPackageRedeemable)(client_1.CustomerPackageStatus.ACTIVE, new Date('2026-01-01'), 0, 4, now)).toBe(false);
    });
    it('is not redeemable once cancelled', () => {
        expect((0, package_eligibility_1.isPackageRedeemable)(client_1.CustomerPackageStatus.CANCELLED, new Date('2026-12-31'), 0, 4, now)).toBe(false);
    });
});
//# sourceMappingURL=package-eligibility.spec.js.map