import { classifyTokenVerificationError } from '../src/modules/estimate-approval/classify-token-error';

describe('classifyTokenVerificationError', () => {
  it('classifies TokenExpiredError as expired', () => {
    expect(classifyTokenVerificationError('TokenExpiredError')).toBe('expired');
  });

  it('classifies JsonWebTokenError (bad signature/malformed) as invalid', () => {
    expect(classifyTokenVerificationError('JsonWebTokenError')).toBe('invalid');
  });

  it('classifies NotBeforeError as invalid', () => {
    expect(classifyTokenVerificationError('NotBeforeError')).toBe('invalid');
  });

  it('classifies an unknown/missing error name as invalid (fail closed)', () => {
    expect(classifyTokenVerificationError(undefined)).toBe('invalid');
    expect(classifyTokenVerificationError('SomeUnexpectedError')).toBe('invalid');
  });
});
