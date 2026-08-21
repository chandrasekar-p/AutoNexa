import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export interface EstimateApprovalTokenPayload {
  estimateId: string;
  tenantId: string;
}

// Must match EstimateApprovalTokenModule's JwtModule signOptions.expiresIn.
const TOKEN_PURPOSE = 'estimate-approval';

/**
 * Mints and verifies the customer self-approval link's token — a JWT
 * signed with its own dedicated secret (ESTIMATE_APPROVAL_SECRET, not
 * JWT_ACCESS_SECRET), not a random string looked up in a table. See the
 * architecture doc §2 for why: the signature is what actually protects
 * this endpoint (the estimateId itself is already an unguessable UUID),
 * and a stateless signed token means "single use" comes for free from
 * EstimatesService's existing SENT-only transition guard — no separate
 * "consumed" flag to keep in sync.
 *
 * Lives in its own tiny module (not inside EstimatesModule or
 * EstimateApprovalModule) specifically so both can depend on it without a
 * circular import: EstimatesService.send()/resendApprovalLink() need to
 * mint a token, EstimateApprovalService needs to verify one, and
 * EstimateApprovalModule already imports EstimatesModule (for
 * applyDecision) — this module has no dependency on either of theirs.
 */
@Injectable()
export class EstimateApprovalTokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  sign(payload: EstimateApprovalTokenPayload): string {
    return this.jwt.sign({ ...payload, purpose: TOKEN_PURPOSE });
  }

  /** Throws (TokenExpiredError | JsonWebTokenError | ...) on anything not validly signed by this system right now — see classify-token-error.ts for turning that into a customer-facing outcome. */
  verify(token: string): EstimateApprovalTokenPayload {
    const decoded = this.jwt.verify<EstimateApprovalTokenPayload & { purpose: string }>(token);
    return { estimateId: decoded.estimateId, tenantId: decoded.tenantId };
  }

  /**
   * Decodes WITHOUT verifying — only ever safe to call after verify()
   * has already thrown specifically a TokenExpiredError (proves the
   * signature genuinely was valid, just time-lapsed), never for a token
   * that failed verification for any other reason. Lets an expired
   * token's audit event still carry a real tenantId/estimateId instead of
   * an unattributed null — see estimate-approval.service.ts.
   */
  decodeExpired(token: string): EstimateApprovalTokenPayload | null {
    const decoded = this.jwt.decode(token) as (Partial<EstimateApprovalTokenPayload> & { purpose?: string }) | null;
    if (!decoded?.estimateId || !decoded?.tenantId || decoded.purpose !== TOKEN_PURPOSE) return null;
    return { estimateId: decoded.estimateId, tenantId: decoded.tenantId };
  }

  buildUrl(token: string): string {
    const frontendUrl = this.config.get<string>('frontendUrl');
    return frontendUrl ? `${frontendUrl}/estimates/approve/${token}` : `/estimates/approve/${token}`;
  }
}
