import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateJobCardPartDto } from '../src/modules/job-cards/dto/create-job-card-part.dto';

describe('CreateJobCardPartDto validation', () => {
  const validPartId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

  it('accepts a minimal valid payload', async () => {
    const dto = plainToInstance(CreateJobCardPartDto, { partId: validPartId, quantity: 2 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a non-UUID partId', async () => {
    const dto = plainToInstance(CreateJobCardPartDto, { partId: 'not-a-uuid', quantity: 2 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'partId')).toBe(true);
  });

  it('rejects a zero quantity', async () => {
    const dto = plainToInstance(CreateJobCardPartDto, { partId: validPartId, quantity: 0 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'quantity')).toBe(true);
  });
});
