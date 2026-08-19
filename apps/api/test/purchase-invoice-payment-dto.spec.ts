import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreatePurchaseInvoiceDto } from '../src/modules/purchase-invoices/dto/create-purchase-invoice.dto';
import { CreateSupplierPaymentDto } from '../src/modules/supplier-payments/dto/create-supplier-payment.dto';

describe('CreatePurchaseInvoiceDto validation', () => {
  const validPoId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

  it('accepts a minimal valid payload', async () => {
    const dto = plainToInstance(CreatePurchaseInvoiceDto, {
      purchaseOrderId: validPoId,
      supplierInvoiceNumber: 'SUPP-INV-001',
      invoiceDate: '2026-08-19',
      subtotal: 5000,
      taxAmount: 900,
      total: 5900,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a missing supplierInvoiceNumber', async () => {
    const dto = plainToInstance(CreatePurchaseInvoiceDto, {
      purchaseOrderId: validPoId,
      invoiceDate: '2026-08-19',
      subtotal: 5000,
      taxAmount: 900,
      total: 5900,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'supplierInvoiceNumber')).toBe(true);
  });

  it('rejects a malformed invoiceDate', async () => {
    const dto = plainToInstance(CreatePurchaseInvoiceDto, {
      purchaseOrderId: validPoId,
      supplierInvoiceNumber: 'SUPP-INV-001',
      invoiceDate: 'not-a-date',
      subtotal: 5000,
      taxAmount: 900,
      total: 5900,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'invoiceDate')).toBe(true);
  });
});

describe('CreateSupplierPaymentDto validation', () => {
  const validInvoiceId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

  it('accepts a minimal valid payload', async () => {
    const dto = plainToInstance(CreateSupplierPaymentDto, {
      purchaseInvoiceId: validInvoiceId,
      amount: 5900,
      paymentDate: '2026-08-19',
      method: 'bank_transfer',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a zero amount', async () => {
    const dto = plainToInstance(CreateSupplierPaymentDto, {
      purchaseInvoiceId: validInvoiceId,
      amount: 0,
      paymentDate: '2026-08-19',
      method: 'bank_transfer',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'amount')).toBe(true);
  });

  it('rejects a missing method', async () => {
    const dto = plainToInstance(CreateSupplierPaymentDto, {
      purchaseInvoiceId: validInvoiceId,
      amount: 5900,
      paymentDate: '2026-08-19',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'method')).toBe(true);
  });
});
