import { Prisma } from '@prisma/client';
import { computeColumnTotals } from '../src/modules/reports/column-totals';

describe('computeColumnTotals', () => {
  it('sums plain-number columns', () => {
    expect(computeColumnTotals([{ count: 3 }, { count: 5 }])).toEqual({ count: 8 });
  });

  it('sums Prisma.Decimal columns', () => {
    const totals = computeColumnTotals([
      { totalOutstanding: new Prisma.Decimal('100.50') },
      { totalOutstanding: new Prisma.Decimal('49.50') },
    ]);
    expect(totals).toEqual({ totalOutstanding: 150 });
  });

  it('excludes a column that is not numeric in every row', () => {
    const totals = computeColumnTotals([{ count: 3, status: 'OPEN' }, { count: 5, status: 'CLOSED' }]);
    expect(totals).toEqual({ count: 8 });
  });

  it('excludes a column with a null value in any row', () => {
    const totals = computeColumnTotals([{ hours: 2 }, { hours: null }]);
    expect(totals).toEqual({});
  });

  it('excludes nested objects (e.g. a joined customer/supplier)', () => {
    const totals = computeColumnTotals([
      { revenue: 100, customer: { id: '1', name: 'A' } },
      { revenue: 200, customer: { id: '2', name: 'B' } },
    ]);
    expect(totals).toEqual({ revenue: 300 });
  });

  it('excludes the id column', () => {
    const totals = computeColumnTotals([{ id: '1', amount: 10 }, { id: '2', amount: 20 }]);
    expect(totals).toEqual({ amount: 30 });
  });

  it('returns an empty object for no rows', () => {
    expect(computeColumnTotals([])).toEqual({});
  });
});
