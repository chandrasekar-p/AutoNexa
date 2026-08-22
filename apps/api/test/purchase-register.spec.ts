import { buildPurchaseRegisterRows, summarizePurchaseItc, countMissingSupplierGstin, PurchaseRegisterLineInput } from '../src/modules/export/purchase-register';

function line(overrides: Partial<PurchaseRegisterLineInput> = {}): PurchaseRegisterLineInput {
  return {
    supplierName: 'Acme Auto Parts',
    supplierGstin: '33AAAAA0000A1Z5',
    supplierInvoiceNumber: 'SUP-0001',
    invoiceDate: new Date('2026-07-10'),
    subtotal: 1000,
    taxAmount: 180,
    total: 1180,
    ...overrides,
  };
}

describe('buildPurchaseRegisterRows', () => {
  it('maps each invoice to a row, defaulting a missing GSTIN to UNREGISTERED', () => {
    const rows = buildPurchaseRegisterRows([line({ supplierGstin: null })]);
    expect(rows[0].supplierGstin).toBe('UNREGISTERED');
    expect(rows[0].taxableValue.toString()).toBe('1000');
  });
});

describe('summarizePurchaseItc', () => {
  it('sums taxable value, tax, and total across all invoices', () => {
    const totals = summarizePurchaseItc([line(), line({ subtotal: 500, taxAmount: 90, total: 590 })]);
    expect(totals.invoiceCount).toBe(2);
    expect(totals.taxableValue.toString()).toBe('1500');
    expect(totals.taxAmount.toString()).toBe('270');
    expect(totals.total.toString()).toBe('1770');
  });

  it('returns zero totals for no invoices', () => {
    const totals = summarizePurchaseItc([]);
    expect(totals.invoiceCount).toBe(0);
    expect(totals.total.toString()).toBe('0');
  });
});

describe('countMissingSupplierGstin', () => {
  it('counts invoices whose supplier has no GSTIN on file', () => {
    expect(countMissingSupplierGstin([line({ supplierGstin: null }), line(), line({ supplierGstin: null })])).toBe(2);
  });
});
