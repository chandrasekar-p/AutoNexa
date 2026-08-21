import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EstimateStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../prisma/tenant-context';
import { EstimatesService } from '../estimates/estimates.service';
import { EstimateApprovalTokenService } from './estimate-approval-token.service';
import { classifyTokenVerificationError } from './classify-token-error';
import { EstimateApprovalSummary } from './dto/estimate-approval-summary';

// See PaymentsGatewayService's own WEBHOOK_SENTINEL_USER_ID for the exact
// same reasoning — structurally required by TenantContextData, not read by
// anything downstream in this path (the normal @Audit() interceptor
// no-ops without request.user regardless, and EstimateApprovalEvent has
// no userId column — this feature's audit trail is that table instead).
const CUSTOMER_LINK_SENTINEL_USER_ID = 'system:estimate-approval-link';

// Only what the summary needs — deliberately narrower than
// EstimatesService's own CUSTOMER_SUMMARY_SELECT/VEHICLE_SUMMARY_SELECT
// (which include mobile/email), so this never even fetches data the
// public response must not carry, let alone risks returning it.
const PUBLIC_CUSTOMER_SELECT = { name: true } as const;
const PUBLIC_VEHICLE_SELECT = { registrationNo: true, brand: true, model: true } as const;

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class EstimateApprovalService {
  private readonly logger = new Logger(EstimateApprovalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalToken: EstimateApprovalTokenService,
    private readonly estimatesService: EstimatesService,
  ) {}

  async getSummary(token: string, meta: RequestMeta): Promise<EstimateApprovalSummary> {
    const payload = await this.verifyOrRecordFailure(token, meta);

    return TenantContext.run(
      { tenantId: payload.tenantId, userId: CUSTOMER_LINK_SENTINEL_USER_ID, isSuperAdmin: false },
      async () => {
        const estimate = await this.prisma.forTenant().estimate.findFirst({
          where: { id: payload.estimateId, deletedAt: null },
          include: {
            lineItems: true,
            customer: { select: PUBLIC_CUSTOMER_SELECT },
            vehicle: { select: PUBLIC_VEHICLE_SELECT },
          },
        });
        if (!estimate) {
          // Signature was valid but the estimate is gone (hard-deleted /
          // soft-deleted after the link was sent) — vanishingly rare, but
          // the customer-facing outcome should read the same as any other
          // unusable link, not leak an internal "not found" message.
          throw new NotFoundException('This link is invalid.');
        }

        await this.logEvent(payload.estimateId, 'VIEWED', meta);
        return this.toSummary(estimate);
      },
    );
  }

  async decide(token: string, decision: 'APPROVED' | 'REJECTED', meta: RequestMeta): Promise<EstimateApprovalSummary> {
    const payload = await this.verifyOrRecordFailure(token, meta);

    return TenantContext.run(
      { tenantId: payload.tenantId, userId: CUSTOMER_LINK_SENTINEL_USER_ID, isSuperAdmin: false },
      async () => {
        try {
          // Same transition guard and notification as the staff approve/
          // reject endpoints — see EstimatesService.applyDecision's own
          // doc comment. 'customer' only changes the notification wording.
          await this.estimatesService.applyDecision(payload.estimateId, decision, 'customer');
        } catch (err) {
          if (err instanceof BadRequestException) {
            // applyDecision's only BadRequestException source is the
            // fromStatus !== SENT guard — i.e. this link was already used
            // (or the estimate moved on some other way) since it was sent.
            await this.logEvent(payload.estimateId, 'ALREADY_DECIDED', meta);
            throw new BadRequestException('This estimate has already been approved or rejected.');
          }
          throw err;
        }

        await this.logEvent(payload.estimateId, decision, meta);

        const estimate = await this.prisma.forTenant().estimate.findFirstOrThrow({
          where: { id: payload.estimateId },
          include: {
            lineItems: true,
            customer: { select: PUBLIC_CUSTOMER_SELECT },
            vehicle: { select: PUBLIC_VEHICLE_SELECT },
          },
        });
        return this.toSummary(estimate);
      },
    );
  }

  /**
   * Verifies the token; on failure, logs a PaymentGatewayEvent-style
   * unattributed row and throws the customer-facing outcome — 404 for
   * both categories (see the architecture doc §4.3: no "you" to
   * authenticate here, and treating expired/invalid identically from the
   * outside avoids giving a token-guessing attempt any signal). An
   * expired token's claims WERE genuinely signed by this system (only its
   * exp lapsed), so — unlike an invalid one — its audit row can still
   * carry a real tenantId/estimateId via decodeExpired(), written through
   * the unscoped platform client with an explicit tenantId rather than
   * TenantContext.run() (verification hasn't fully succeeded, so this
   * isn't "inside" a normal authenticated flow yet).
   */
  private async verifyOrRecordFailure(token: string, meta: RequestMeta) {
    try {
      return this.approvalToken.verify(token);
    } catch (err) {
      const errorName = err instanceof Error ? err.name : undefined;
      const outcome = classifyTokenVerificationError(errorName);
      const recovered = outcome === 'expired' ? this.approvalToken.decodeExpired(token) : null;

      try {
        await this.prisma.platform.estimateApprovalEvent.create({
          data: {
            tenantId: recovered?.tenantId ?? null,
            estimateId: recovered?.estimateId ?? null,
            action: outcome === 'expired' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
            ipAddress: meta.ip ?? null,
            userAgent: meta.userAgent ?? null,
          } as unknown as Prisma.EstimateApprovalEventUncheckedCreateInput,
        });
      } catch (logErr) {
        // A logging failure must not mask the real (expired/invalid link)
        // outcome the customer needs to see.
        this.logger.warn(`Failed to record ${outcome} estimate-approval token event: ${String(logErr)}`);
      }

      throw new NotFoundException(
        outcome === 'expired'
          ? 'This link has expired. Please contact the workshop for a new one.'
          : 'This link is invalid.',
      );
    }
  }

  private async logEvent(estimateId: string, action: string, meta: RequestMeta): Promise<void> {
    try {
      await this.prisma.forTenant().estimateApprovalEvent.create({
        data: {
          estimateId,
          action,
          ipAddress: meta.ip ?? null,
          userAgent: meta.userAgent ?? null,
        } as unknown as Prisma.EstimateApprovalEventUncheckedCreateInput,
      });
    } catch (err) {
      this.logger.warn(`Failed to record ${action} estimate-approval event for ${estimateId}: ${String(err)}`);
    }
  }

  private toSummary(estimate: {
    id: string;
    status: EstimateStatus;
    jobDescription: string | null;
    subtotal: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
    total: Prisma.Decimal;
    customer: { name: string };
    vehicle: { registrationNo: string; brand: string; model: string };
    lineItems: { description: string; quantity: Prisma.Decimal; unitPrice: Prisma.Decimal; gstRate: Prisma.Decimal; lineTotal: Prisma.Decimal }[];
  }): EstimateApprovalSummary {
    return {
      estimateNumber: `EST-${estimate.id.slice(0, 8).toUpperCase()}`,
      status: estimate.status,
      jobDescription: estimate.jobDescription,
      vehicleLabel: `${estimate.vehicle.registrationNo} ${estimate.vehicle.brand} ${estimate.vehicle.model}`,
      customerName: estimate.customer.name,
      lineItems: estimate.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        gstRate: item.gstRate.toString(),
        lineTotal: item.lineTotal.toString(),
      })),
      subtotal: estimate.subtotal.toString(),
      taxAmount: estimate.taxAmount.toString(),
      discountAmount: estimate.discountAmount.toString(),
      total: estimate.total.toString(),
    };
  }
}
