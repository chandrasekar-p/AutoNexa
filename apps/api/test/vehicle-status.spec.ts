import { computeExpiryStatus, computeVehicleStatus } from '../src/modules/vehicles/vehicle-status';

const NOW = new Date('2026-08-25T00:00:00.000Z');

describe('computeExpiryStatus', () => {
  it('returns not_set when no expiry date is on file', () => {
    expect(computeExpiryStatus(null, NOW)).toBe('not_set');
  });

  it('returns expired for a past date', () => {
    expect(computeExpiryStatus(new Date('2026-08-01T00:00:00.000Z'), NOW)).toBe('expired');
  });

  it('returns expiring_soon within the next 30 days', () => {
    expect(computeExpiryStatus(new Date('2026-09-10T00:00:00.000Z'), NOW)).toBe('expiring_soon');
  });

  it('returns active for a date more than 30 days out', () => {
    expect(computeExpiryStatus(new Date('2027-01-01T00:00:00.000Z'), NOW)).toBe('active');
  });

  it('treats exactly the soon-threshold boundary as expiring_soon, not active', () => {
    const exactlyThirtyDaysOut = new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000);
    expect(computeExpiryStatus(exactlyThirtyDaysOut, NOW)).toBe('expiring_soon');
  });
});

describe('computeVehicleStatus', () => {
  it('returns NO_DATA when neither insurance nor PUC is set', () => {
    expect(computeVehicleStatus(null, null, NOW)).toBe('NO_DATA');
  });

  it('returns EXPIRED when insurance has expired even if PUC is fine', () => {
    expect(computeVehicleStatus(new Date('2026-08-01T00:00:00.000Z'), new Date('2027-01-01T00:00:00.000Z'), NOW)).toBe('EXPIRED');
  });

  it('returns EXPIRED when PUC has expired even if insurance is fine', () => {
    expect(computeVehicleStatus(new Date('2027-01-01T00:00:00.000Z'), new Date('2026-08-01T00:00:00.000Z'), NOW)).toBe('EXPIRED');
  });

  it('returns ACTIVE when both are current', () => {
    expect(computeVehicleStatus(new Date('2027-01-01T00:00:00.000Z'), new Date('2027-01-01T00:00:00.000Z'), NOW)).toBe('ACTIVE');
  });

  it('returns ACTIVE when one is current and the other was never set', () => {
    expect(computeVehicleStatus(new Date('2027-01-01T00:00:00.000Z'), null, NOW)).toBe('ACTIVE');
  });
});
