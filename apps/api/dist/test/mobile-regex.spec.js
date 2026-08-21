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
//# sourceMappingURL=mobile-regex.spec.js.map