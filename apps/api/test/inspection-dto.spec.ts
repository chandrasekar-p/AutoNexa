import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateInspectionDto } from '../src/modules/inspections/dto/create-inspection.dto';
import { CreateInspectionItemDto } from '../src/modules/inspections/dto/create-inspection-item.dto';

describe('CreateInspectionDto validation', () => {
  const validVehicleId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

  it('accepts a minimal valid payload', async () => {
    const dto = plainToInstance(CreateInspectionDto, { vehicleId: validVehicleId });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a missing vehicleId', async () => {
    const dto = plainToInstance(CreateInspectionDto, {});
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'vehicleId')).toBe(true);
  });

  it('rejects a non-UUID appointmentId', async () => {
    const dto = plainToInstance(CreateInspectionDto, {
      vehicleId: validVehicleId,
      appointmentId: 'not-a-uuid',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'appointmentId')).toBe(true);
  });
});

describe('CreateInspectionItemDto validation', () => {
  it('accepts a minimal valid payload', async () => {
    const dto = plainToInstance(CreateInspectionItemDto, { category: 'EXTERIOR', itemName: 'Cabin Air Filter' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects an invalid category enum value', async () => {
    const dto = plainToInstance(CreateInspectionItemDto, { category: 'UNDERBODY', itemName: 'Cabin Air Filter' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'category')).toBe(true);
  });

  it('rejects a missing itemName', async () => {
    const dto = plainToInstance(CreateInspectionItemDto, { category: 'EXTERIOR' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'itemName')).toBe(true);
  });
});
