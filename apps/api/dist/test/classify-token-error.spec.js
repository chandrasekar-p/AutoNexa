"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const classify_token_error_1 = require("../src/modules/estimate-approval/classify-token-error");
describe('classifyTokenVerificationError', () => {
    it('classifies TokenExpiredError as expired', () => {
        expect((0, classify_token_error_1.classifyTokenVerificationError)('TokenExpiredError')).toBe('expired');
    });
    it('classifies JsonWebTokenError (bad signature/malformed) as invalid', () => {
        expect((0, classify_token_error_1.classifyTokenVerificationError)('JsonWebTokenError')).toBe('invalid');
    });
    it('classifies NotBeforeError as invalid', () => {
        expect((0, classify_token_error_1.classifyTokenVerificationError)('NotBeforeError')).toBe('invalid');
    });
    it('classifies an unknown/missing error name as invalid (fail closed)', () => {
        expect((0, classify_token_error_1.classifyTokenVerificationError)(undefined)).toBe('invalid');
        expect((0, classify_token_error_1.classifyTokenVerificationError)('SomeUnexpectedError')).toBe('invalid');
    });
});
//# sourceMappingURL=classify-token-error.spec.js.map