import { formatSequenceNumber } from '../src/common/sequence/generate-sequence-number';

describe('formatSequenceNumber', () => {
  it('pads a small number to the default 4 digits with the given prefix', () => {
    expect(formatSequenceNumber('JC', 1)).toBe('JC-0001');
  });

  it('pads correctly for a mid-range number', () => {
    expect(formatSequenceNumber('JC', 42)).toBe('JC-0042');
  });

  it('does not truncate a number wider than padLength', () => {
    expect(formatSequenceNumber('JC', 12345)).toBe('JC-12345');
  });

  it('respects a custom padLength', () => {
    expect(formatSequenceNumber('INV', 7, 6)).toBe('INV-000007');
  });
});
