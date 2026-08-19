import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateJobCardDto } from '../src/modules/job-cards/dto/create-job-card.dto';
import { CreateJobCardLabourDto } from '../src/modules/job-cards/dto/create-job-card-labour.dto';
import { CreateJobCardNoteDto } from '../src/modules/job-cards/dto/create-job-card-note.dto';
import { UpdateJobCardStatusDto } from '../src/modules/job-cards/dto/update-job-card-status.dto';

describe('CreateJobCardDto validation', () => {
  const validVehicleId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
  const validCustomerId = '3fa85f64-5717-4562-b3fc-2c963f66afa7';

  it('accepts a minimal valid payload', async () => {
    const dto = plainToInstance(CreateJobCardDto, {
      vehicleId: validVehicleId,
      customerId: validCustomerId,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a non-UUID vehicleId', async () => {
    const dto = plainToInstance(CreateJobCardDto, {
      vehicleId: 'not-a-uuid',
      customerId: validCustomerId,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'vehicleId')).toBe(true);
  });

  it('rejects a missing customerId', async () => {
    const dto = plainToInstance(CreateJobCardDto, { vehicleId: validVehicleId });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'customerId')).toBe(true);
  });

  it('rejects a negative odometer', async () => {
    const dto = plainToInstance(CreateJobCardDto, {
      vehicleId: validVehicleId,
      customerId: validCustomerId,
      odometer: -5,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'odometer')).toBe(true);
  });

  it('rejects a malformed expectedDelivery', async () => {
    const dto = plainToInstance(CreateJobCardDto, {
      vehicleId: validVehicleId,
      customerId: validCustomerId,
      expectedDelivery: 'not-a-date',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'expectedDelivery')).toBe(true);
  });
});

describe('CreateJobCardLabourDto validation', () => {
  const validLabourItemId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

  it('accepts a minimal valid payload', async () => {
    const dto = plainToInstance(CreateJobCardLabourDto, { labourItemId: validLabourItemId });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a non-UUID labourItemId', async () => {
    const dto = plainToInstance(CreateJobCardLabourDto, { labourItemId: 'not-a-uuid' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'labourItemId')).toBe(true);
  });

  it('rejects a zero hours override', async () => {
    const dto = plainToInstance(CreateJobCardLabourDto, { labourItemId: validLabourItemId, hours: 0 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'hours')).toBe(true);
  });
});

describe('CreateJobCardNoteDto validation', () => {
  it('rejects an empty note', async () => {
    const dto = plainToInstance(CreateJobCardNoteDto, { note: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'note')).toBe(true);
  });

  it('accepts a non-empty note', async () => {
    const dto = plainToInstance(CreateJobCardNoteDto, { note: 'Customer confirmed over phone' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('UpdateJobCardStatusDto validation', () => {
  it('rejects an invalid status enum value', async () => {
    const dto = plainToInstance(UpdateJobCardStatusDto, { status: 'FINISHED' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'status')).toBe(true);
  });

  it('accepts a valid status', async () => {
    const dto = plainToInstance(UpdateJobCardStatusDto, { status: 'DIAGNOSIS' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
