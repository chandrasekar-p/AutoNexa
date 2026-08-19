import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateInvoicePaymentDto } from '../src/modules/invoices/dto/create-invoice-payment.dto';

describe('CreateInvoicePaymentDto validation', () => {
  it('accepts a minimal valid payload', async () => {
    const dto = plainToInstance(CreateInvoicePaymentDto, { amount: 5000, method: 'upi' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a zero amount', async () => {
    const dto = plainToInstance(CreateInvoicePaymentDto, { amount: 0, method: 'upi' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'amount')).toBe(true);
  });

  it('rejects an invalid method', async () => {
    const dto = plainToInstance(CreateInvoicePaymentDto, { amount: 5000, method: 'cheque' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'method')).toBe(true);
  });

  it('rejects a malformed paymentDate when provided', async () => {
    const dto = plainToInstance(CreateInvoicePaymentDto, { amount: 5000, method: 'cash', paymentDate: 'not-a-date' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'paymentDate')).toBe(true);
  });

  it('accepts every documented payment method', async () => {
    for (const method of ['cash', 'upi', 'card', 'bank_transfer', 'credit']) {
      const dto = plainToInstance(CreateInvoicePaymentDto, { amount: 100, method });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });
});
