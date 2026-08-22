import { buildB2bRows, buildB2cSummaryRows, buildHsnSummaryRows, countMissingHsn, GstrInvoiceInput } from '../src/modules/export/gstr1-rows';

function invoice(overrides: Partial<GstrInvoiceInput> = {}): GstrInvoiceInput {
  return {
    invoiceNumber: 'INV-0001',
    invoiceDate: new Date('2026-07-15'),
    grandTotal: 1180,
    customerGstin: null,
    customerState: 'Tamil Nadu',
    lineItems: [{ hsnSac: '8708', gstRate: 18, lineTotal: 1000, quantity: 1 }],
    ...overrides,
  };
}

describe('buildB2bRows', () => {
  it('includes only invoices with a customer GSTIN, same-state split into CGST+SGST', () => {
    const rows = buildB2bRows(
      [invoice({ customerGstin: '33ABCDE1234F1Z5', customerState: 'Tamil Nadu' }), invoice({ customerGstin: null })],
      'Tamil Nadu',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].gstin).toBe('33ABCDE1234F1Z5');
    expect(rows[0].cgstAmount.toString()).toBe('90');
    expect(rows[0].sgstAmount.toString()).toBe('90');
    expect(rows[0].igstAmount.toString()).toBe('0');
  });

  it('splits into IGST for an inter-state customer', () => {
    const rows = buildB2bRows([invoice({ customerGstin: '27ABCDE1234F1Z5', customerState: 'Maharashtra' })], 'Tamil Nadu');
    expect(rows[0].igstAmount.toString()).toBe('180');
    expect(rows[0].cgstAmount.toString()).toBe('0');
  });

  it('produces one row per distinct rate within the same invoice', () => {
    const rows = buildB2bRows(
      [
        invoice({
          customerGstin: '33ABCDE1234F1Z5',
          lineItems: [
            { hsnSac: '8708', gstRate: 18, lineTotal: 1000, quantity: 1 },
            { hsnSac: '9987', gstRate: 5, lineTotal: 200, quantity: 1 },
          ],
        }),
      ],
      'Tamil Nadu',
    );
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.rate).sort()).toEqual(['18', '5']);
  });
});

describe('buildB2cSummaryRows', () => {
  it('groups by place of supply and rate, ignoring B2B invoices', () => {
    const rows = buildB2cSummaryRows(
      [invoice({ customerGstin: null, customerState: 'Tamil Nadu' }), invoice({ customerGstin: 'X' }), invoice({ customerGstin: null, customerState: 'Tamil Nadu' })],
      'Tamil Nadu',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].taxableValue.toString()).toBe('2000');
  });
});

describe('buildHsnSummaryRows', () => {
  it('buckets a line with no HSN/SAC under UNSPECIFIED rather than dropping it', () => {
    const rows = buildHsnSummaryRows([invoice({ lineItems: [{ hsnSac: null, gstRate: 18, lineTotal: 1000, quantity: 1 }] })], 'Tamil Nadu');
    expect(rows).toHaveLength(1);
    expect(rows[0].hsnSac).toBe('UNSPECIFIED');
    expect(rows[0].taxableValue.toString()).toBe('1000');
  });

  it('sums quantity and taxable value across B2B and B2C invoices sharing an HSN+rate', () => {
    const rows = buildHsnSummaryRows(
      [
        invoice({ customerGstin: 'X', lineItems: [{ hsnSac: '8708', gstRate: 18, lineTotal: 1000, quantity: 2 }] }),
        invoice({ customerGstin: null, lineItems: [{ hsnSac: '8708', gstRate: 18, lineTotal: 500, quantity: 1 }] }),
      ],
      'Tamil Nadu',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].totalQuantity.toString()).toBe('3');
    expect(rows[0].taxableValue.toString()).toBe('1500');
  });
});

describe('countMissingHsn', () => {
  it('counts every line item across every invoice with no hsnSac', () => {
    const count = countMissingHsn([
      invoice({ lineItems: [{ hsnSac: null, gstRate: 18, lineTotal: 100, quantity: 1 }, { hsnSac: '8708', gstRate: 18, lineTotal: 100, quantity: 1 }] }),
      invoice({ lineItems: [{ hsnSac: null, gstRate: 18, lineTotal: 100, quantity: 1 }] }),
    ]);
    expect(count).toBe(2);
  });

  it('returns 0 when every line has an HSN/SAC code', () => {
    expect(countMissingHsn([invoice()])).toBe(0);
  });
});
