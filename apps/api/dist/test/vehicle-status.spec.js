"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vehicle_status_1 = require("../src/modules/vehicles/vehicle-status");
const NOW = new Date('2026-08-25T00:00:00.000Z');
describe('computeExpiryStatus', () => {
    it('returns not_set when no expiry date is on file', () => {
        expect((0, vehicle_status_1.computeExpiryStatus)(null, NOW)).toBe('not_set');
    });
    it('returns expired for a past date', () => {
        expect((0, vehicle_status_1.computeExpiryStatus)(new Date('2026-08-01T00:00:00.000Z'), NOW)).toBe('expired');
    });
    it('returns expiring_soon within the next 30 days', () => {
        expect((0, vehicle_status_1.computeExpiryStatus)(new Date('2026-09-10T00:00:00.000Z'), NOW)).toBe('expiring_soon');
    });
    it('returns active for a date more than 30 days out', () => {
        expect((0, vehicle_status_1.computeExpiryStatus)(new Date('2027-01-01T00:00:00.000Z'), NOW)).toBe('active');
    });
    it('treats exactly the soon-threshold boundary as expiring_soon, not active', () => {
        const exactlyThirtyDaysOut = new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000);
        expect((0, vehicle_status_1.computeExpiryStatus)(exactlyThirtyDaysOut, NOW)).toBe('expiring_soon');
    });
});
describe('computeVehicleStatus', () => {
    it('returns NO_DATA when neither insurance nor PUC is set', () => {
        expect((0, vehicle_status_1.computeVehicleStatus)(null, null, NOW)).toBe('NO_DATA');
    });
    it('returns EXPIRED when insurance has expired even if PUC is fine', () => {
        expect((0, vehicle_status_1.computeVehicleStatus)(new Date('2026-08-01T00:00:00.000Z'), new Date('2027-01-01T00:00:00.000Z'), NOW)).toBe('EXPIRED');
    });
    it('returns EXPIRED when PUC has expired even if insurance is fine', () => {
        expect((0, vehicle_status_1.computeVehicleStatus)(new Date('2027-01-01T00:00:00.000Z'), new Date('2026-08-01T00:00:00.000Z'), NOW)).toBe('EXPIRED');
    });
    it('returns ACTIVE when both are current', () => {
        expect((0, vehicle_status_1.computeVehicleStatus)(new Date('2027-01-01T00:00:00.000Z'), new Date('2027-01-01T00:00:00.000Z'), NOW)).toBe('ACTIVE');
    });
    it('returns ACTIVE when one is current and the other was never set', () => {
        expect((0, vehicle_status_1.computeVehicleStatus)(new Date('2027-01-01T00:00:00.000Z'), null, NOW)).toBe('ACTIVE');
    });
});
//# sourceMappingURL=vehicle-status.spec.js.map