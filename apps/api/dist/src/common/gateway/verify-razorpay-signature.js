"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRazorpaySignature = verifyRazorpaySignature;
const crypto_1 = require("crypto");
function verifyRazorpaySignature(rawBody, signatureHeader, webhookSecret) {
    if (!signatureHeader)
        return false;
    const expected = (0, crypto_1.createHmac)('sha256', webhookSecret).update(rawBody).digest('hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    const actualBuf = Buffer.from(signatureHeader, 'hex');
    if (expectedBuf.length !== actualBuf.length)
        return false;
    return (0, crypto_1.timingSafeEqual)(expectedBuf, actualBuf);
}
//# sourceMappingURL=verify-razorpay-signature.js.map