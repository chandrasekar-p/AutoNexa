import { createHmac } from 'crypto';
import { verifyRazorpaySignature } from '../src/common/gateway/verify-razorpay-signature';

const SECRET = 'whsec_test_secret';

function sign(body: string, secret = SECRET): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

describe('verifyRazorpaySignature', () => {
  it('accepts a correctly signed body', () => {
    const body = JSON.stringify({ event: 'payment.captured' });
    expect(verifyRazorpaySignature(body, sign(body), SECRET)).toBe(true);
  });

  it('rejects a tampered body signed with the original signature', () => {
    const original = JSON.stringify({ event: 'payment.captured', amount: 100 });
    const tampered = JSON.stringify({ event: 'payment.captured', amount: 100000 });
    expect(verifyRazorpaySignature(tampered, sign(original), SECRET)).toBe(false);
  });

  it('rejects a signature produced with the wrong secret', () => {
    const body = JSON.stringify({ event: 'payment.captured' });
    expect(verifyRazorpaySignature(body, sign(body, 'wrong_secret'), SECRET)).toBe(false);
  });

  it('rejects when the signature header is missing', () => {
    const body = JSON.stringify({ event: 'payment.captured' });
    expect(verifyRazorpaySignature(body, undefined, SECRET)).toBe(false);
  });

  it('rejects a malformed (non-hex, wrong-length) signature header', () => {
    const body = JSON.stringify({ event: 'payment.captured' });
    expect(verifyRazorpaySignature(body, 'not-a-real-signature', SECRET)).toBe(false);
  });

  it('works against a raw Buffer body, not just a string', () => {
    const body = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
    expect(verifyRazorpaySignature(body, sign(body.toString()), SECRET)).toBe(true);
  });
});
