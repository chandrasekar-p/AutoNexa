import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateSupplierDto } from '../src/modules/suppliers/dto/create-supplier.dto';

describe('CreateSupplierDto validation', () => {
  it('accepts a minimal valid payload', async () => {
    const dto = plainToInstance(CreateSupplierDto, { name: 'Bosch Distributors' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a missing name', async () => {
    const dto = plainToInstance(CreateSupplierDto, {});
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('rejects a malformed email when provided', async () => {
    const dto = plainToInstance(CreateSupplierDto, { name: 'Bosch Distributors', email: 'not-an-email' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });
});
