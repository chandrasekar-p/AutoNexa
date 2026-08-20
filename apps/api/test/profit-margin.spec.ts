import { calculatePartMargin, calculateTotalMargin } from '../src/modules/reports/profit-margin';

describe('calculatePartMargin', () => {
  it('computes (sellingPrice - purchasePrice) x quantity', () => {
    const margin = calculatePartMargin({ quantity: 3, sellingPrice: 1200, purchasePrice: 800 });
    expect(margin.toString()).toBe('1200');
  });

  it('is negative when sold below purchase price', () => {
    const margin = calculatePartMargin({ quantity: 1, sellingPrice: 100, purchasePrice: 150 });
    expect(margin.toString()).toBe('-50');
  });

  it('is zero when sold at exactly purchase price', () => {
    const margin = calculatePartMargin({ quantity: 5, sellingPrice: 100, purchasePrice: 100 });
    expect(margin.toString()).toBe('0');
  });
});

describe('calculateTotalMargin', () => {
  it('adds parts margin and labour revenue (labour counted at 100% margin)', () => {
    const total = calculateTotalMargin(1200, 800);
    expect(total.toString()).toBe('2000');
  });

  it('handles a negative parts margin correctly', () => {
    const total = calculateTotalMargin(-50, 800);
    expect(total.toString()).toBe('750');
  });
});
