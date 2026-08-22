import { toCsvRow, toCsv } from '../src/modules/export/csv';

describe('toCsvRow', () => {
  it('joins plain fields with commas, unquoted', () => {
    expect(toCsvRow(['a', 'b', 1])).toBe('a,b,1');
  });

  it('quotes a field containing a comma', () => {
    expect(toCsvRow(['Acme, Inc', 'ok'])).toBe('"Acme, Inc",ok');
  });

  it('doubles embedded quotes and wraps the field in quotes', () => {
    expect(toCsvRow(['He said "hi"'])).toBe('"He said ""hi"""');
  });

  it('quotes a field containing a newline', () => {
    expect(toCsvRow(['line1\nline2'])).toBe('"line1\nline2"');
  });
});

describe('toCsv', () => {
  it('joins rows with newlines', () => {
    expect(toCsv([['a', 'b'], ['c', 'd']])).toBe('a,b\nc,d');
  });
});
