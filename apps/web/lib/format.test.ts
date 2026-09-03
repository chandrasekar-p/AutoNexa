import { describe, expect, it } from 'vitest';
import { formatLastLogin, formatQuantity } from './format';

const NOW = new Date(2026, 7, 31, 14, 30, 0); // 31 Aug 2026, 2:30 PM (local-time constructor, matches this session's established fix for timezone-flaky date-boundary tests)

describe('formatLastLogin', () => {
  it('shows "Today, ..." for a timestamp earlier today', () => {
    const result = formatLastLogin(new Date(2026, 7, 31, 9, 12, 0), NOW);
    expect(result.startsWith('Today, ')).toBe(true);
    expect(result.toLowerCase()).toBe('today, 09:12 am');
  });

  it('shows "Yesterday, ..." for a timestamp on the prior calendar day', () => {
    const result = formatLastLogin(new Date(2026, 7, 30, 18, 25, 0), NOW);
    expect(result.startsWith('Yesterday, ')).toBe(true);
    expect(result.toLowerCase()).toBe('yesterday, 06:25 pm');
  });

  it('falls back to a full date for anything older', () => {
    const result = formatLastLogin(new Date(2026, 7, 2, 11, 40, 0), NOW);
    expect(result.toLowerCase()).toBe('02 aug 2026, 11:40 am');
  });
});

describe('formatQuantity', () => {
  it('shows PIECE quantities as a plain integer count, no suffix', () => {
    expect(formatQuantity('150.000', 'PIECE')).toBe('150');
    expect(formatQuantity(3, 'PIECE')).toBe('3');
  });

  it('trims trailing zeros for fractional units but keeps up to 3 decimal places', () => {
    expect(formatQuantity('150.000', 'LITRE')).toBe('150 L');
    expect(formatQuantity('2.500', 'LITRE')).toBe('2.5 L');
    expect(formatQuantity('0.750', 'KG')).toBe('0.75 kg');
    expect(formatQuantity('2.750', 'GRAM')).toBe('2.75 g');
    expect(formatQuantity('1.005', 'ML')).toBe('1.005 mL');
  });

  it('returns an em dash for a non-numeric value', () => {
    expect(formatQuantity('not-a-number', 'LITRE')).toBe('—');
  });
});
