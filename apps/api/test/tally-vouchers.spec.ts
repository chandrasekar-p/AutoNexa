import { isVoucherBalanced } from '../src/modules/export/tally-xml';
import { buildSalesVoucher, buildReceiptVoucher, buildPurchaseVoucher, buildPaymentVoucher } from '../src/modules/export/tally-vouchers';

describe('buildSalesVoucher', () => {
  it('produces a balanced voucher covering party debit and sales+tax credits', () => {
    const voucher = buildSalesVoucher({
      invoiceNumber: 'INV-0001',
      invoiceDate: new Date('2026-07-15'),
      customerName: 'Ravi Kumar',
      subtotal: 1000,
      cgstAmount: 90,
      sgstAmount: 90,
      igstAmount: 0,
      roundOff: 0,
      grandTotal: 1180,
    });
    expect(isVoucherBalanced(voucher)).toBe(true);
    expect(voucher.ledgerEntries).not.toEqual(expect.arrayContaining([expect.objectContaining({ ledgerName: 'Output IGST' })]));
  });

  it('omits a zero tax head rather than emitting a zero-amount ledger line', () => {
    const voucher = buildSalesVoucher({
      invoiceNumber: 'INV-0002',
      invoiceDate: new Date('2026-07-15'),
      customerName: 'Ravi Kumar',
      subtotal: 1000,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 180,
      roundOff: 0,
      grandTotal: 1180,
    });
    const ledgerNames = voucher.ledgerEntries.map((e) => e.ledgerName);
    expect(ledgerNames).not.toContain('Output CGST');
    expect(ledgerNames).toContain('Output IGST');
    expect(isVoucherBalanced(voucher)).toBe(true);
  });

  it('includes a round-off ledger line and stays balanced when roundOff is non-zero', () => {
    const voucher = buildSalesVoucher({
      invoiceNumber: 'INV-0003',
      invoiceDate: new Date('2026-07-15'),
      customerName: 'Ravi Kumar',
      subtotal: 1000,
      cgstAmount: 90,
      sgstAmount: 90,
      igstAmount: 0,
      roundOff: 0.4,
      grandTotal: 1180.4,
    });
    expect(isVoucherBalanced(voucher)).toBe(true);
    expect(voucher.ledgerEntries.some((e) => e.ledgerName === 'Round Off')).toBe(true);
  });
});

describe('buildReceiptVoucher', () => {
  it('debits the bank/cash ledger and credits the customer, balanced', () => {
    const voucher = buildReceiptVoucher({ reference: 'PAY-1', paymentDate: new Date('2026-07-16'), customerName: 'Ravi Kumar', amount: 1180, method: 'cash' });
    expect(isVoucherBalanced(voucher)).toBe(true);
    expect(voucher.ledgerEntries.find((e) => e.isDebit)?.ledgerName).toBe('Cash');
  });

  it('routes a non-cash method to Bank Account', () => {
    const voucher = buildReceiptVoucher({ reference: 'PAY-2', paymentDate: new Date('2026-07-16'), customerName: 'Ravi Kumar', amount: 500, method: 'upi' });
    expect(voucher.ledgerEntries.find((e) => e.isDebit)?.ledgerName).toBe('Bank Account');
  });
});

describe('buildPurchaseVoucher', () => {
  it('splits tax evenly into Input CGST/SGST and stays balanced (same-state approximation)', () => {
    const voucher = buildPurchaseVoucher({
      supplierInvoiceNumber: 'SUP-0001',
      invoiceDate: new Date('2026-07-10'),
      supplierName: 'Acme Auto Parts',
      subtotal: 1000,
      taxAmount: 180,
      total: 1180,
    });
    expect(isVoucherBalanced(voucher)).toBe(true);
    const cgst = voucher.ledgerEntries.find((e) => e.ledgerName === 'Input CGST');
    const sgst = voucher.ledgerEntries.find((e) => e.ledgerName === 'Input SGST');
    expect(cgst?.amount?.toString()).toBe('90');
    expect(sgst?.amount?.toString()).toBe('90');
  });

  it('omits input tax lines entirely when taxAmount is zero', () => {
    const voucher = buildPurchaseVoucher({ supplierInvoiceNumber: 'SUP-0002', invoiceDate: new Date('2026-07-10'), supplierName: 'Acme', subtotal: 1000, taxAmount: 0, total: 1000 });
    expect(voucher.ledgerEntries.some((e) => e.ledgerName.startsWith('Input'))).toBe(false);
    expect(isVoucherBalanced(voucher)).toBe(true);
  });
});

describe('buildPaymentVoucher', () => {
  it('debits the supplier and credits the bank/cash ledger, balanced', () => {
    const voucher = buildPaymentVoucher({ reference: 'SP-1', paymentDate: new Date('2026-07-11'), supplierName: 'Acme Auto Parts', amount: 1180, method: 'bank_transfer' });
    expect(isVoucherBalanced(voucher)).toBe(true);
    expect(voucher.ledgerEntries.find((e) => e.isDebit)?.ledgerName).toBe('Acme Auto Parts');
  });
});
