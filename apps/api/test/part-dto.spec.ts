import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreatePartDto } from '../src/modules/parts/dto/create-part.dto';
import { CreatePartCategoryDto } from '../src/modules/parts/dto/create-part-category.dto';

describe('CreatePartDto validation', () => {
  it('accepts a minimal valid payload', async () => {
    const dto = plainToInstance(CreatePartDto, {
      partNumber: 'PN-10234',
      sku: 'SKU-BRK-001',
      name: 'Front brake pad set',
      purchasePrice: 800,
      sellingPrice: 1200,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a missing partNumber', async () => {
    const dto = plainToInstance(CreatePartDto, {
      sku: 'SKU-BRK-001',
      name: 'Front brake pad set',
      purchasePrice: 800,
      sellingPrice: 1200,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'partNumber')).toBe(true);
  });

  it('rejects a negative sellingPrice', async () => {
    const dto = plainToInstance(CreatePartDto, {
      partNumber: 'PN-10234',
      sku: 'SKU-BRK-001',
      name: 'Front brake pad set',
      purchasePrice: 800,
      sellingPrice: -1,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'sellingPrice')).toBe(true);
  });

  it('rejects a non-UUID categoryId', async () => {
    const dto = plainToInstance(CreatePartDto, {
      partNumber: 'PN-10234',
      sku: 'SKU-BRK-001',
      name: 'Front brake pad set',
      purchasePrice: 800,
      sellingPrice: 1200,
      categoryId: 'not-a-uuid',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'categoryId')).toBe(true);
  });
});

describe('CreatePartCategoryDto validation', () => {
  it('rejects a missing name', async () => {
    const dto = plainToInstance(CreatePartCategoryDto, {});
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('accepts a valid name', async () => {
    const dto = plainToInstance(CreatePartCategoryDto, { name: 'Brakes' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
