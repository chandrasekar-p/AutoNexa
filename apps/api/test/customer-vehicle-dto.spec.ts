import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateCustomerDto } from '../src/modules/customers/dto/create-customer.dto';
import { CreateVehicleDto } from '../src/modules/vehicles/dto/create-vehicle.dto';

describe('CreateCustomerDto validation', () => {
  it('accepts a minimal valid payload', async () => {
    const dto = plainToInstance(CreateCustomerDto, { name: 'Ravi Kumar', mobile: '9876543210' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a missing name', async () => {
    const dto = plainToInstance(CreateCustomerDto, { mobile: '9876543210' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('rejects an invalid customerType', async () => {
    const dto = plainToInstance(CreateCustomerDto, {
      name: 'Acme Fleet',
      mobile: '9876543210',
      customerType: 'nonprofit',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'customerType')).toBe(true);
  });

  it('rejects a malformed email when provided', async () => {
    const dto = plainToInstance(CreateCustomerDto, {
      name: 'Ravi Kumar',
      mobile: '9876543210',
      email: 'not-an-email',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });
});

describe('CreateVehicleDto validation', () => {
  const validCustomerId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

  it('accepts a minimal valid payload', async () => {
    const dto = plainToInstance(CreateVehicleDto, {
      customerId: validCustomerId,
      registrationNo: 'TN 37 AB 1234',
      brand: 'BMW',
      model: 'X5',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a non-UUID customerId', async () => {
    const dto = plainToInstance(CreateVehicleDto, {
      customerId: 'not-a-uuid',
      registrationNo: 'TN 37 AB 1234',
      brand: 'BMW',
      model: 'X5',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'customerId')).toBe(true);
  });

  it('rejects an invalid fuelType enum value', async () => {
    const dto = plainToInstance(CreateVehicleDto, {
      customerId: validCustomerId,
      registrationNo: 'TN 37 AB 1234',
      brand: 'BMW',
      model: 'X5',
      fuelType: 'coal',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'fuelType')).toBe(true);
  });

  it('rejects a manufactureYear before 1980', async () => {
    const dto = plainToInstance(CreateVehicleDto, {
      customerId: validCustomerId,
      registrationNo: 'TN 37 AB 1234',
      brand: 'BMW',
      model: 'X5',
      manufactureYear: 1920,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'manufactureYear')).toBe(true);
  });
});
