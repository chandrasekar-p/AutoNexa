import { describe, expect, it } from 'vitest';
import { validateEstimateLineItemForm } from './estimate-line-item';

describe('validateEstimateLineItemForm', () => {
  it('accepts a valid labour line', () => {
    const result = validateEstimateLineItemForm({
      itemType: 'LABOUR',
      description: 'Brake pad replacement',
      quantity: 1.5,
      unitPrice: 600,
      gstRate: 18,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing description', () => {
    const result = validateEstimateLineItemForm({
      itemType: 'PART',
      description: '',
      quantity: 1,
      unitPrice: 500,
      gstRate: 18,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.description).toBeDefined();
  });

  it('rejects a zero or negative quantity', () => {
    const result = validateEstimateLineItemForm({
      itemType: 'PART',
      description: 'Oil filter',
      quantity: 0,
      unitPrice: 500,
      gstRate: 18,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.quantity).toBeDefined();
  });

  it('rejects a negative unit price', () => {
    const result = validateEstimateLineItemForm({
      itemType: 'PART',
      description: 'Oil filter',
      quantity: 1,
      unitPrice: -10,
      gstRate: 18,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.unitPrice).toBeDefined();
  });

  it('rejects an invalid itemType', () => {
    const result = validateEstimateLineItemForm({
      itemType: 'TOOL',
      description: 'Wrench rental',
      quantity: 1,
      unitPrice: 100,
      gstRate: 18,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.itemType).toBeDefined();
  });
});
