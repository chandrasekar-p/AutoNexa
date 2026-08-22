import { computeWarrantyStatus } from '../src/modules/warranty/warranty-status';

describe('computeWarrantyStatus', () => {
  const now = new Date('2026-06-15T00:00:00.000Z');

  it('has no coverage when the vehicle has not been delivered yet', () => {
    const result = computeWarrantyStatus(null, 6, null, null, null, now);
    expect(result.expiresAt).toBeNull();
    expect(result.isActive).toBe(false);
  });

  it('has no coverage when neither warrantyMonths nor warrantyKm was offered', () => {
    const result = computeWarrantyStatus(new Date('2026-01-01'), null, null, null, null, now);
    expect(result.expiresAt).toBeNull();
    expect(result.isActive).toBe(false);
  });

  it('is active within the date window', () => {
    const result = computeWarrantyStatus(new Date('2026-01-01'), 6, null, null, null, now);
    expect(result.isActive).toBe(true);
    expect(result.expiresAt?.toISOString()).toBe('2026-07-01T00:00:00.000Z');
  });

  it('is expired once past the date window', () => {
    const result = computeWarrantyStatus(new Date('2025-01-01'), 6, null, null, null, now);
    expect(result.isActive).toBe(false);
  });

  it('is expired by km once the odometer delta crosses warrantyKm, even if still within the date window', () => {
    const result = computeWarrantyStatus(new Date('2026-01-01'), 12, 5000, 40000, 46000, now);
    expect(result.expiredByKm).toBe(true);
    expect(result.isActive).toBe(false);
  });

  it('is active by km when the odometer delta has not yet crossed warrantyKm', () => {
    const result = computeWarrantyStatus(new Date('2026-01-01'), 12, 5000, 40000, 43000, now);
    expect(result.expiredByKm).toBe(false);
    expect(result.isActive).toBe(true);
  });

  it('skips the km check when the current odometer is unknown', () => {
    const result = computeWarrantyStatus(new Date('2026-01-01'), 12, 5000, 40000, null, now);
    expect(result.expiredByKm).toBe(false);
    expect(result.isActive).toBe(true);
  });

  it('skips the km check when the odometer at service was never recorded', () => {
    const result = computeWarrantyStatus(new Date('2026-01-01'), 12, 5000, null, 50000, now);
    expect(result.expiredByKm).toBe(false);
    expect(result.isActive).toBe(true);
  });

  it('a part with only a km-based term (no months) can still be active with no expiresAt', () => {
    const result = computeWarrantyStatus(new Date('2026-01-01'), null, 5000, 40000, 43000, now);
    expect(result.expiresAt).toBeNull();
    expect(result.isActive).toBe(true);
  });
});
