import { INDIAN_MOBILE_REGEX, toE164 } from '../src/common/validators/mobile';

describe('INDIAN_MOBILE_REGEX', () => {
  it.each(['9876543210', '+91 98765 43210', '+919876543210', '09876543210', '9876543210'])(
    'accepts %s',
    (value) => {
      expect(INDIAN_MOBILE_REGEX.test(value)).toBe(true);
    },
  );

  it.each([
    '12345',
    '12345678901',
    'abcdefghij',
    '5876543210', // doesn't start 6-9
    '',
    '98765-43210-1',
  ])('rejects %s', (value) => {
    expect(INDIAN_MOBILE_REGEX.test(value)).toBe(false);
  });
});

describe('toE164', () => {
  it.each([
    ['9092262278', '+919092262278'],
    ['+91 98765 43210', '+919876543210'],
    ['+919876543210', '+919876543210'],
    ['09876543210', '+919876543210'],
    ['098765 43210', '+919876543210'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(toE164(input)).toBe(expected);
  });

  it.each(['12345', 'abcdefghij', '5876543210', ''])('returns malformed input unchanged: %s', (value) => {
    expect(toE164(value)).toBe(value);
  });
});
