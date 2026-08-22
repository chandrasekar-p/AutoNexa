import { isLineFreeUnderWarrantyClaim } from '../src/modules/warranty/warranty-claim-coverage';

describe('isLineFreeUnderWarrantyClaim', () => {
  it('is never free when the line has no claim tag at all', () => {
    expect(isLineFreeUnderWarrantyClaim(null, new Map([['claim-1', false]]))).toBe(false);
  });

  it('is free when tagged to a claim whose isBillable is false', () => {
    expect(isLineFreeUnderWarrantyClaim('claim-1', new Map([['claim-1', false]]))).toBe(true);
  });

  it('bills normally when tagged to a claim whose isBillable is true (rejected/undecided claim)', () => {
    expect(isLineFreeUnderWarrantyClaim('claim-1', new Map([['claim-1', true]]))).toBe(false);
  });

  it('bills normally (fails safe) when the claim id is not found in the map', () => {
    expect(isLineFreeUnderWarrantyClaim('claim-missing', new Map([['claim-1', false]]))).toBe(false);
  });
});
