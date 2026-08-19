import { isOverpayment } from '../src/modules/invoices/payment-guard';

describe('isOverpayment', () => {
  it('allows a payment that exactly settles the remaining balance', () => {
    expect(isOverpayment(8000, 11800, 3800)).toBe(false);
  });

  it('allows a payment below the remaining balance', () => {
    expect(isOverpayment(8000, 11800, 2000)).toBe(false);
  });

  it('rejects a payment that would exceed the grand total', () => {
    expect(isOverpayment(8000, 11800, 4000)).toBe(true);
  });

  it('rejects any payment once the invoice is already fully paid', () => {
    expect(isOverpayment(11800, 11800, 1)).toBe(true);
  });

  it('allows the first payment on a fresh invoice up to the full total', () => {
    expect(isOverpayment(0, 11800, 11800)).toBe(false);
  });
});
