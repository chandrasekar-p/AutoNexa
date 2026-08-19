import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateTechnicianDto } from '../src/modules/technicians/dto/create-technician.dto';

describe('CreateTechnicianDto validation', () => {
  const validUserId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

  it('accepts a minimal valid payload', async () => {
    const dto = plainToInstance(CreateTechnicianDto, { userId: validUserId });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a non-UUID userId', async () => {
    const dto = plainToInstance(CreateTechnicianDto, { userId: 'not-a-uuid' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'userId')).toBe(true);
  });

  it('rejects a negative experienceYears', async () => {
    const dto = plainToInstance(CreateTechnicianDto, { userId: validUserId, experienceYears: -1 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'experienceYears')).toBe(true);
  });

  it('accepts a skills array', async () => {
    const dto = plainToInstance(CreateTechnicianDto, { userId: validUserId, skills: ['engine', 'electrical'] });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a non-string skills entry', async () => {
    const dto = plainToInstance(CreateTechnicianDto, { userId: validUserId, skills: ['engine', 42] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'skills')).toBe(true);
  });
});
