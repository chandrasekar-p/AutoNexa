import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Razorpay signs each webhook with HMAC-SHA256 over the exact raw request
 * body, keyed by RAZORPAY_WEBHOOK_SECRET — a separate secret from the API
 * key/secret pair used for outbound calls (see RazorpayProvider). The
 * signature arrives in the `X-Razorpay-Signature` header.
 *
 * Pure and DB-free, same "extract as a pure function, test that" pattern
 * as job-card-status-transitions.ts/gst-split.ts — the one thing this
 * function must get right is the whole trust boundary for the webhook
 * route (see payments-gateway.controller.ts, which has no JwtAuthGuard).
 *
 * `rawBody` must be the untouched bytes Razorpay sent, not a re-serialized
 * JSON.stringify(parsedBody) — those are not guaranteed byte-identical
 * (key ordering, whitespace), which would make a genuine signature fail
 * verification. See main.ts's `rawBody: true` bootstrap option.
 */
export function verifyRazorpaySignature(rawBody: Buffer | string, signatureHeader: string | undefined, webhookSecret: string): boolean {
  if (!signatureHeader) return false;

  const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

  // Constant-time comparison — a plain `===` on hex strings leaks timing
  // information about how many leading characters matched, which is
  // exactly the kind of side channel HMAC verification exists to avoid.
  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(signatureHeader, 'hex');
  if (expectedBuf.length !== actualBuf.length) return false;

  return timingSafeEqual(expectedBuf, actualBuf);
}
