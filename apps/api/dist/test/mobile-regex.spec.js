"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mobile_1 = require("../src/common/validators/mobile");
describe('INDIAN_MOBILE_REGEX', () => {
    it.each(['9876543210', '+91 98765 43210', '+919876543210', '09876543210', '9876543210'])('accepts %s', (value) => {
        expect(mobile_1.INDIAN_MOBILE_REGEX.test(value)).toBe(true);
    });
    it.each([
        '12345',
        '12345678901',
        'abcdefghij',
        '5876543210',
        '',
        '98765-43210-1',
    ])('rejects %s', (value) => {
        expect(mobile_1.INDIAN_MOBILE_REGEX.test(value)).toBe(false);
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
        expect((0, mobile_1.toE164)(input)).toBe(expected);
    });
    it.each(['12345', 'abcdefghij', '5876543210', ''])('returns malformed input unchanged: %s', (value) => {
        expect((0, mobile_1.toE164)(value)).toBe(value);
    });
});
//# sourceMappingURL=mobile-regex.spec.js.map