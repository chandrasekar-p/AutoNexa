import { describe, expect, it } from 'vitest';
import { computeColumnTotals } from './column-totals';

describe('computeColumnTotals', () => {
  it('sums plain-number columns', () => {
    expect(computeColumnTotals([{ count: 3 }, { count: 5 }])).toEqual({ count: 8 });
  });

  it('sums numeric-string columns (e.g. a serialized Decimal)', () => {
    expect(computeColumnTotals([{ amount: '100.50' }, { amount: '49.50' }])).toEqual({ amount: 150 });
  });

  it('excludes a column that is not numeric in every row', () => {
    expect(computeColumnTotals([{ count: 3, status: 'OPEN' }, { count: 5, status: 'CLOSED' }])).toEqual({ count: 8 });
  });

  it('excludes a column with a null value in any row', () => {
    expect(computeColumnTotals([{ hours: 2 }, { hours: null }])).toEqual({});
  });

  it('excludes nested objects (e.g. a joined customer)', () => {
    const totals = computeColumnTotals([
      { revenue: 100, customer: { id: '1', name: 'A' } },
      { revenue: 200, customer: { id: '2', name: 'B' } },
    ]);
    expect(totals).toEqual({ revenue: 300 });
  });

  it('excludes the id column', () => {
    expect(computeColumnTotals([{ id: '1', amount: 10 }, { id: '2', amount: 20 }])).toEqual({ amount: 30 });
  });

  it('returns an empty object for no rows', () => {
    expect(computeColumnTotals([])).toEqual({});
  });
});
