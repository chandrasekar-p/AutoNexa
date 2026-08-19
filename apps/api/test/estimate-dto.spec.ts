import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateEstimateDto } from '../src/modules/estimates/dto/create-estimate.dto';
import { CreateEstimateLineItemDto } from '../src/modules/estimates/dto/create-estimate-line-item.dto';

describe('CreateEstimateDto validation', () => {
  const validCustomerId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
  const validVehicleId = '3fa85f64-5717-4562-b3fc-2c963f66afa7';

  it('accepts a minimal valid payload', async () => {
    const dto = plainToInstance(CreateEstimateDto, {
      customerId: validCustomerId,
      vehicleId: validVehicleId,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a non-UUID customerId', async () => {
    const dto = plainToInstance(CreateEstimateDto, {
      customerId: 'not-a-uuid',
      vehicleId: validVehicleId,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'customerId')).toBe(true);
  });

  it('rejects a negative discountAmount', async () => {
    const dto = plainToInstance(CreateEstimateDto, {
      customerId: validCustomerId,
      vehicleId: validVehicleId,
      discountAmount: -50,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'discountAmount')).toBe(true);
  });

  it('validates nested lineItems and rejects an invalid one', async () => {
    const dto = plainToInstance(CreateEstimateDto, {
      customerId: validCustomerId,
      vehicleId: validVehicleId,
      lineItems: [{ itemType: 'LABOUR', description: 'Wheel alignment', unitPrice: -100 }],
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'lineItems')).toBe(true);
  });

  it('accepts valid nested lineItems', async () => {
    const dto = plainToInstance(CreateEstimateDto, {
      customerId: validCustomerId,
      vehicleId: validVehicleId,
      lineItems: [{ itemType: 'LABOUR', description: 'Wheel alignment', unitPrice: 500 }],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('CreateEstimateLineItemDto validation', () => {
  it('rejects an invalid itemType enum value', async () => {
    const dto = plainToInstance(CreateEstimateLineItemDto, {
      itemType: 'FUEL',
      description: 'Petrol top-up',
      unitPrice: 100,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'itemType')).toBe(true);
  });

  it('rejects a missing unitPrice', async () => {
    const dto = plainToInstance(CreateEstimateLineItemDto, {
      itemType: 'PART',
      description: 'Brake pads',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'unitPrice')).toBe(true);
  });
});
