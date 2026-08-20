import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ListNotificationsQueryDto } from '../src/modules/notifications/dto/list-notifications-query.dto';
import { AlertsQueryDto } from '../src/modules/notifications/dto/alerts-query.dto';

describe('ListNotificationsQueryDto validation', () => {
  it('accepts an empty payload', async () => {
    const dto = plainToInstance(ListNotificationsQueryDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('coerces isRead from a query string', async () => {
    const dto = plainToInstance(ListNotificationsQueryDto, { isRead: 'true' });
    expect(dto.isRead).toBe(true);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a pageSize over 100', async () => {
    const dto = plainToInstance(ListNotificationsQueryDto, { pageSize: 500 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'pageSize')).toBe(true);
  });
});

describe('AlertsQueryDto validation', () => {
  it('defaults days to 30 when omitted', () => {
    const dto = plainToInstance(AlertsQueryDto, {});
    expect(dto.days).toBe(30);
  });

  it('rejects a days value over 365', async () => {
    const dto = plainToInstance(AlertsQueryDto, { days: 400 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'days')).toBe(true);
  });

  it('rejects a zero days value', async () => {
    const dto = plainToInstance(AlertsQueryDto, { days: 0 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'days')).toBe(true);
  });
});
