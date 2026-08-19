import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateLabourItemDto } from '../src/modules/labour-items/dto/create-labour-item.dto';

describe('CreateLabourItemDto validation', () => {
  it('accepts a minimal valid payload', async () => {
    const dto = plainToInstance(CreateLabourItemDto, {
      code: 'LBR-001',
      description: 'Front brake pad replacement',
      standardHours: 1.5,
      labourRate: 400,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a missing code', async () => {
    const dto = plainToInstance(CreateLabourItemDto, {
      description: 'Front brake pad replacement',
      standardHours: 1.5,
      labourRate: 400,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'code')).toBe(true);
  });

  it('rejects a zero standardHours', async () => {
    const dto = plainToInstance(CreateLabourItemDto, {
      code: 'LBR-001',
      description: 'Front brake pad replacement',
      standardHours: 0,
      labourRate: 400,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'standardHours')).toBe(true);
  });

  it('rejects a negative labourRate', async () => {
    const dto = plainToInstance(CreateLabourItemDto, {
      code: 'LBR-001',
      description: 'Front brake pad replacement',
      standardHours: 1.5,
      labourRate: -50,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'labourRate')).toBe(true);
  });
});
