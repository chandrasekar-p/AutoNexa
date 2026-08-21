"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const verify_razorpay_signature_1 = require("../src/common/gateway/verify-razorpay-signature");
const SECRET = 'whsec_test_secret';
function sign(body, secret = SECRET) {
    return (0, crypto_1.createHmac)('sha256', secret).update(body).digest('hex');
}
describe('verifyRazorpaySignature', () => {
    it('accepts a correctly signed body', () => {
        const body = JSON.stringify({ event: 'payment.captured' });
        expect((0, verify_razorpay_signature_1.verifyRazorpaySignature)(body, sign(body), SECRET)).toBe(true);
    });
    it('rejects a tampered body signed with the original signature', () => {
        const original = JSON.stringify({ event: 'payment.captured', amount: 100 });
        const tampered = JSON.stringify({ event: 'payment.captured', amount: 100000 });
        expect((0, verify_razorpay_signature_1.verifyRazorpaySignature)(tampered, sign(original), SECRET)).toBe(false);
    });
    it('rejects a signature produced with the wrong secret', () => {
        const body = JSON.stringify({ event: 'payment.captured' });
        expect((0, verify_razorpay_signature_1.verifyRazorpaySignature)(body, sign(body, 'wrong_secret'), SECRET)).toBe(false);
    });
    it('rejects when the signature header is missing', () => {
        const body = JSON.stringify({ event: 'payment.captured' });
        expect((0, verify_razorpay_signature_1.verifyRazorpaySignature)(body, undefined, SECRET)).toBe(false);
    });
    it('rejects a malformed (non-hex, wrong-length) signature header', () => {
        const body = JSON.stringify({ event: 'payment.captured' });
        expect((0, verify_razorpay_signature_1.verifyRazorpaySignature)(body, 'not-a-real-signature', SECRET)).toBe(false);
    });
    it('works against a raw Buffer body, not just a string', () => {
        const body = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
        expect((0, verify_razorpay_signature_1.verifyRazorpaySignature)(body, sign(body.toString()), SECRET)).toBe(true);
    });
});
//# sourceMappingURL=verify-razorpay-signature.spec.js.map