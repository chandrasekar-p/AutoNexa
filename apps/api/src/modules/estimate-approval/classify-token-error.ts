/**
 * JwtService.verify() (via the `jsonwebtoken` library underneath) throws
 * distinct error classes for "signed by us, but its exp has passed"
 * (`TokenExpiredError`) vs "not validly signed by us at all — tampered,
 * malformed, or forged" (everything else, typically `JsonWebTokenError`).
 * That distinction matters: an expired token's payload was genuinely
 * signed by this system, so its estimateId/tenantId claims are still
 * trustworthy for audit purposes (see estimate-approval.service.ts); an
 * invalid one's claims can't be trusted at all.
 *
 * Takes the caught error's `.name` string rather than importing
 * `jsonwebtoken`'s error classes directly — that package is only a
 * transitive dependency of @nestjs/jwt, not one this project depends on
 * explicitly, and a bare string check is exactly as reliable here (the
 * error name is part of jsonwebtoken's own stable public contract) without
 * adding a dependency this codebase doesn't otherwise need.
 */
export function classifyTokenVerificationError(errorName: string | undefined): 'expired' | 'invalid' {
  return errorName === 'TokenExpiredError' ? 'expired' : 'invalid';
}
