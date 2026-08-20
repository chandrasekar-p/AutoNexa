import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { DateRangeQueryDto } from '../src/modules/reports/dto/date-range-query.dto';
import { SalesReportQueryDto } from '../src/modules/reports/dto/sales-report-query.dto';
import { InvoicesReportQueryDto } from '../src/modules/reports/dto/invoices-report-query.dto';
import { PaymentsReportQueryDto } from '../src/modules/reports/dto/payments-report-query.dto';

describe('DateRangeQueryDto validation', () => {
  it('accepts an empty payload — every field is optional', async () => {
    const dto = plainToInstance(DateRangeQueryDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a malformed from date', async () => {
    const dto = plainToInstance(DateRangeQueryDto, { from: 'not-a-date' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'from')).toBe(true);
  });
});

describe('SalesReportQueryDto validation', () => {
  it('accepts a valid groupBy', async () => {
    const dto = plainToInstance(SalesReportQueryDto, { groupBy: 'month' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects an invalid groupBy', async () => {
    const dto = plainToInstance(SalesReportQueryDto, { groupBy: 'week' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'groupBy')).toBe(true);
  });

  it('still validates the inherited from/to fields', async () => {
    const dto = plainToInstance(SalesReportQueryDto, { from: 'not-a-date' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'from')).toBe(true);
  });
});

describe('InvoicesReportQueryDto validation', () => {
  it('rejects an invalid status', async () => {
    const dto = plainToInstance(InvoicesReportQueryDto, { status: 'OVERDUE' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'status')).toBe(true);
  });

  it('accepts a valid status', async () => {
    const dto = plainToInstance(InvoicesReportQueryDto, { status: 'PAID' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('PaymentsReportQueryDto validation', () => {
  it('rejects an invalid method', async () => {
    const dto = plainToInstance(PaymentsReportQueryDto, { method: 'cheque' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'method')).toBe(true);
  });

  it('accepts a valid method', async () => {
    const dto = plainToInstance(PaymentsReportQueryDto, { method: 'upi' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
