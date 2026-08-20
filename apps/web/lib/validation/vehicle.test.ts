import { describe, expect, it } from 'vitest';
import { validateVehicleForm } from './vehicle';

describe('validateVehicleForm', () => {
  it('accepts a minimal valid payload (registrationNo, brand, model only)', () => {
    const result = validateVehicleForm({ registrationNo: 'TN 37 AB 1234', brand: 'BMW', model: 'X5' });
    expect(result.success).toBe(true);
  });

  it('rejects a missing registration number', () => {
    const result = validateVehicleForm({ registrationNo: '', brand: 'BMW', model: 'X5' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.registrationNo).toBeDefined();
  });

  it('rejects a missing brand or model', () => {
    const result = validateVehicleForm({ registrationNo: 'TN 37 AB 1234', brand: '', model: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.brand).toBeDefined();
      expect(result.errors.model).toBeDefined();
    }
  });

  it('rejects a manufacture year before 1980', () => {
    const result = validateVehicleForm({
      registrationNo: 'TN 37 AB 1234',
      brand: 'BMW',
      model: 'X5',
      manufactureYear: 1975,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.manufactureYear).toBeDefined();
  });

  it('normalizes blank optional strings and NaN numbers (from empty form inputs) to undefined', () => {
    const result = validateVehicleForm({
      registrationNo: 'TN 37 AB 1234',
      brand: 'BMW',
      model: 'X5',
      vin: '',
      fuelType: '',
      transmission: '',
      manufactureYear: NaN,
      odometerReading: NaN,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vin).toBeUndefined();
      expect(result.data.fuelType).toBeUndefined();
      expect(result.data.transmission).toBeUndefined();
      expect(result.data.manufactureYear).toBeUndefined();
      expect(result.data.odometerReading).toBeUndefined();
    }
  });

  it('accepts a fully populated payload', () => {
    const result = validateVehicleForm({
      registrationNo: 'TN 37 AB 1234',
      vin: 'WBA12345678901234',
      brand: 'BMW',
      model: 'X5',
      variant: 'xDrive30d',
      manufactureYear: 2022,
      fuelType: 'diesel',
      transmission: 'automatic',
      colour: 'Black',
      odometerReading: 15000,
      insuranceExpiry: '2027-01-01',
      pucExpiry: '2026-12-01',
      warrantyInfo: '3 years',
      purchaseDate: '2022-03-15',
      notes: 'Regular customer',
    });
    expect(result.success).toBe(true);
  });
});
