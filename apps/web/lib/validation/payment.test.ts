import { describe, expect, it } from 'vitest';
import { validatePaymentForm } from './payment';

describe('validatePaymentForm', () => {
  it('accepts a minimal valid payload', () => {
    const result = validatePaymentForm({ amount: 500, method: 'upi' });
    expect(result.success).toBe(true);
  });

  it('rejects a zero or negative amount', () => {
    const result = validatePaymentForm({ amount: 0, method: 'cash' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.amount).toBeDefined();
  });

  it('rejects an invalid payment method', () => {
    const result = validatePaymentForm({ amount: 500, method: 'cheque' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.method).toBeDefined();
  });

  it('normalizes blank optional fields to undefined', () => {
    const result = validatePaymentForm({ amount: 500, method: 'cash', paymentDate: '', referenceNumber: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paymentDate).toBeUndefined();
      expect(result.data.referenceNumber).toBeUndefined();
    }
  });
});
