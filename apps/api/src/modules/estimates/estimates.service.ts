import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EstimateStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../prisma/tenant-context';
import { JobCardsService } from '../job-cards/job-cards.service';
import { MessagingService } from '../messaging/messaging.service';
import { estimateReadyMessage } from '../messaging/templates';
import { EstimateApprovalTokenService } from '../estimate-approval/estimate-approval-token.service';
import { generateSequenceNumber } from '../../common/sequence/generate-sequence-number';
import { dateRangeWhere } from '../reports/reports.service';
import { deriveEstimateApprovalStatus, EstimateApprovalStatus } from './estimate-approval-status';
import { CreateEstimateDto } from './dto/create-estimate.dto';
import { UpdateEstimateDto } from './dto/update-estimate.dto';
import { ListEstimatesQueryDto } from './dto/list-estimates-query.dto';
import { CreateEstimateLineItemDto } from './dto/create-estimate-line-item.dto';
import { UpdateEstimateLineItemDto } from './dto/update-estimate-line-item.dto';
import { calculateEstimateTotals, calculateLineTotal } from './estimate-totals';

const CUSTOMER_SUMMARY_SELECT = { id: true, name: true, mobile: true, email: true } as const;
const VEHICLE_SUMMARY_SELECT = { id: true, registrationNo: true, brand: true, model: true } as const;

const LIST_INCLUDE = {
  customer: { select: { name: true } },
  vehicle: { select: { registrationNo: true, brand: true, model: true } },
  jobCard: { select: { invoice: { select: { invoiceNumber: true } } } },
  // Only need to know WHETHER a VIEWED event exists, not the events
  // themselves — take: 1 keeps this cheap regardless of how many times a
  // customer reopened the link.
  approvalEvents: { where: { action: 'VIEWED' }, select: { id: true }, take: 1 },
} as const;

function toListRow(estimate: Prisma.EstimateGetPayload<{ include: typeof LIST_INCLUDE }>) {
  const { customer, vehicle, jobCard, approvalEvents, ...rest } = estimate;
  return {
    ...rest,
    customerName: customer.name,
    vehicleRegistrationNo: vehicle.registrationNo,
    vehicleBrand: vehicle.brand,
    vehicleModel: vehicle.model,
    linkedInvoiceNumber: jobCard?.invoice?.invoiceNumber ?? null,
    approvalStatus: deriveEstimateApprovalStatus(estimate.status, approvalEvents.length > 0) as EstimateApprovalStatus,
  };
}

@Injectable()
export class EstimatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobCardsService: JobCardsService,
    private readonly messaging: MessagingService,
    private readonly approvalToken: EstimateApprovalTokenService,
  ) {}

  // Casts below are needed because forTenant() injects tenantId into `data`
  // at runtime (see PrismaService) — the generated create types can't see that.
  async create(dto: CreateEstimateDto) {
    await this.assertCustomerExists(dto.customerId);
    await this.assertVehicleExists(dto.vehicleId);
    const tenantId = TenantContext.requireTenantId();
    const db = this.prisma.forTenant();
    const tenantSettings = await this.prisma.platform.tenantSettings.findUniqueOrThrow({ where: { tenantId } });

    const estimate = await db.$transaction(async (tx) => {
      const estimateNumber = await generateSequenceNumber(tx as unknown as Prisma.TransactionClient, tenantId, 'ESTIMATE', tenantSettings.estimatePrefix);
      return tx.estimate.create({
        data: {
          customerId: dto.customerId,
          vehicleId: dto.vehicleId,
          jobDescription: dto.jobDescription,
          discountAmount: dto.discountAmount ?? 0,
          estimateNumber,
        } as unknown as Prisma.EstimateUncheckedCreateInput,
      });
    });

    if (dto.lineItems?.length) {
      await db.estimateLineItem.createMany({
        data: dto.lineItems.map((item) =>
          this.toLineItemRow(estimate.id, item),
        ) as unknown as Prisma.EstimateLineItemCreateManyInput[],
      });
      return this.recalculate(estimate.id);
    }

    return this.findOne(estimate.id);
  }

  async findAll(query: ListEstimatesQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const db = this.prisma.forTenant();

    const where = {
      deletedAt: null,
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
      ...this.approvalStatusWhere(query),
      ...dateRangeWhere('createdAt', query.from, query.to),
      ...(query.search
        ? { jobDescription: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [rows, total] = await Promise.all([
      db.estimate.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.estimate.count({ where }),
    ]);

    return { items: rows.map(toListRow), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /**
   * KPI cards for the Estimates page — total count, per-status counts
   * (including the derived 'awaitingApproval'), and total estimate value.
   * A single pass over every non-deleted estimate's status + whether it
   * has a VIEWED approval event, reusing the exact same derivation
   * findAll() uses so the pills' counts can never disagree with what
   * clicking into a pill actually filters to.
   */
  async summary() {
    const db = this.prisma.forTenant();
    const rows = await db.estimate.findMany({
      where: { deletedAt: null },
      select: { status: true, total: true, approvalEvents: { where: { action: 'VIEWED' }, select: { id: true }, take: 1 } },
    });

    const counts: Record<EstimateApprovalStatus, number> = {
      DRAFT: 0,
      SENT: 0,
      AWAITING_APPROVAL: 0,
      APPROVED: 0,
      REJECTED: 0,
      EXPIRED: 0,
      CONVERTED: 0,
    };
    let totalValue = new Prisma.Decimal(0);

    for (const row of rows) {
      const approvalStatus = deriveEstimateApprovalStatus(row.status, row.approvalEvents.length > 0);
      counts[approvalStatus] += 1;
      totalValue = totalValue.add(row.total);
    }

    return {
      total: rows.length,
      draft: counts.DRAFT,
      sent: counts.SENT,
      awaitingApproval: counts.AWAITING_APPROVAL,
      approved: counts.APPROVED,
      rejected: counts.REJECTED,
      expired: counts.EXPIRED,
      converted: counts.CONVERTED,
      totalValue: totalValue.toDecimalPlaces(2),
    };
  }

  /**
   * `approvalStatus` (derived-aware, see estimate-approval-status.ts)
   * takes precedence over the plain `status` param when both are given —
   * 'AWAITING_APPROVAL' filters to SENT-with-a-VIEWED-event, 'SENT' here
   * specifically EXCLUDES those (so the two pills partition SENT estimates
   * without double-counting), and any real EstimateStatus value filters
   * on `status` directly, same as before this field existed.
   */
  private approvalStatusWhere(query: ListEstimatesQueryDto): Record<string, unknown> {
    if (query.approvalStatus === 'AWAITING_APPROVAL') {
      return { status: EstimateStatus.SENT, approvalEvents: { some: { action: 'VIEWED' } } };
    }
    if (query.approvalStatus === EstimateStatus.SENT) {
      return { status: EstimateStatus.SENT, approvalEvents: { none: { action: 'VIEWED' } } };
    }
    if (query.approvalStatus) {
      return { status: query.approvalStatus };
    }
    return query.status ? { status: query.status } : {};
  }

  async findOne(id: string) {
    const estimate = await this.prisma.forTenant().estimate.findFirst({
      where: { id, deletedAt: null },
      include: { lineItems: true },
    });
    if (!estimate) throw new NotFoundException('Estimate not found');
    return estimate;
  }

  async update(id: string, dto: UpdateEstimateDto) {
    await this.assertExists(id);
    await this.prisma.forTenant().estimate.update({ where: { id }, data: dto });
    // discountAmount may have changed — recalculate unconditionally so
    // `total` never drifts from what's actually on the estimate.
    return this.recalculate(id);
  }

  async remove(id: string) {
    await this.assertExists(id);
    return this.prisma.forTenant().estimate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async addLineItem(estimateId: string, dto: CreateEstimateLineItemDto) {
    await this.assertExists(estimateId);
    await this.prisma.forTenant().estimateLineItem.create({
      data: this.toLineItemRow(estimateId, dto) as unknown as Prisma.EstimateLineItemUncheckedCreateInput,
    });
    return this.recalculate(estimateId);
  }

  async updateLineItem(estimateId: string, itemId: string, dto: UpdateEstimateLineItemDto) {
    const existing = await this.assertLineItemExists(estimateId, itemId);
    const quantity = dto.quantity ?? existing.quantity;
    const unitPrice = dto.unitPrice ?? existing.unitPrice;
    const gstRate = dto.gstRate ?? existing.gstRate;

    await this.prisma.forTenant().estimateLineItem.update({
      where: { id: itemId },
      data: {
        itemType: dto.itemType ?? existing.itemType,
        description: dto.description ?? existing.description,
        quantity,
        unitPrice,
        gstRate,
        lineTotal: calculateLineTotal(quantity, unitPrice),
      },
    });
    return this.recalculate(estimateId);
  }

  async removeLineItem(estimateId: string, itemId: string) {
    await this.assertLineItemExists(estimateId, itemId);
    await this.prisma.forTenant().estimateLineItem.delete({ where: { id: itemId } });
    return this.recalculate(estimateId);
  }

  async send(id: string) {
    const estimate = await this.transition(id, EstimateStatus.DRAFT, EstimateStatus.SENT, {});
    await this.sendApprovalLinkMessage(id, estimate, 'estimate.ready');
    return estimate;
  }

  /**
   * For when the original link's 7-day token has expired (or was just
   * lost) but the estimate is still SENT — mints a fresh token and
   * re-sends, same shape as InvoicesService.resend() for an invoice PDF.
   * Deliberately does NOT touch Estimate.status — same reasoning as
   * invoice resend never touching InvoiceStatus, this is delivery, not a
   * business transition.
   */
  async resendApprovalLink(id: string) {
    const estimate = await this.assertExists(id);
    if (estimate.status !== EstimateStatus.SENT) {
      throw new BadRequestException('Estimate must be in SENT status to resend the approval link');
    }
    const full = await this.prisma.forTenant().estimate.findFirstOrThrow({
      where: { id },
      include: { lineItems: true, customer: { select: CUSTOMER_SUMMARY_SELECT }, vehicle: { select: VEHICLE_SUMMARY_SELECT } },
    });
    await this.sendApprovalLinkMessage(id, full, 'estimate.resend');
    return full;
  }

  private async sendApprovalLinkMessage(
    id: string,
    estimate: {
      total: Prisma.Decimal;
      jobDescription: string | null;
      estimateNumber: string | null;
      customer: { name: string; mobile: string; email: string | null };
      vehicle: { registrationNo: string; brand: string; model: string };
    },
    event: string,
  ) {
    const tenantId = TenantContext.requireTenantId();
    const tenant = await this.prisma.platform.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    const approvalUrl = this.approvalToken.buildUrl(this.approvalToken.sign({ estimateId: id, tenantId }));
    const content = estimateReadyMessage({
      workshopName: tenant?.name ?? 'AutoNexa',
      customerName: estimate.customer.name,
      vehicleLabel: `${estimate.vehicle.registrationNo} ${estimate.vehicle.brand} ${estimate.vehicle.model}`,
      // Falls back to the old ID-derived format only for the rare estimate
      // that somehow still has no real number (pre-backfill window) —
      // every estimate going forward always has one from create().
      estimateNumber: estimate.estimateNumber ?? `EST-${id.slice(0, 8).toUpperCase()}`,
      grandTotal: `₹${Number(estimate.total).toFixed(2)}`,
      approvalUrl,
    });

    await this.messaging.notifyCustomer(
      tenantId,
      event,
      { email: estimate.customer.email, mobile: estimate.customer.mobile },
      content,
      { type: 'Estimate', id },
    );

    await this.messaging.notifyOps(
      tenantId,
      event,
      `Estimate sent: ${estimate.customer.name} — ${estimate.vehicle.registrationNo} — ₹${Number(estimate.total).toFixed(2)}`,
      { type: 'Estimate', id },
    );
  }

  async approve(id: string) {
    return this.applyDecision(id, 'APPROVED', 'staff');
  }

  async reject(id: string) {
    return this.applyDecision(id, 'REJECTED', 'staff');
  }

  /**
   * Shared core for both the staff approve/reject endpoints above and the
   * customer self-service approval path (EstimateApprovalService, which
   * calls this after verifying the customer's link token and resolving
   * tenant context — see the architecture doc §4.2). Same transition
   * guard, same notification, regardless of who made the call; `source`
   * only affects the notification's wording, so staff can tell which
   * happened without checking EstimateApprovalEvent.
   */
  async applyDecision(id: string, decision: 'APPROVED' | 'REJECTED', source: 'staff' | 'customer') {
    const toStatus = decision === 'APPROVED' ? EstimateStatus.APPROVED : EstimateStatus.REJECTED;
    const extra = decision === 'APPROVED' ? { approvedAt: new Date() } : { rejectedAt: new Date() };
    const estimate = await this.transition(id, EstimateStatus.SENT, toStatus, extra);

    if (decision === 'APPROVED') {
      // Estimates don't track a per-estimate owner/service advisor (no such
      // field on the model), so this is broadcast-only (userId: null) for
      // now — every tenant user sees it. Revisit once/if Estimate gains
      // ownership tracking. Only APPROVED gets a notification — REJECTED
      // never has, matching the pre-existing behavior this refactor must
      // not change.
      await this.prisma.forTenant().notification.create({
        data: {
          userId: null,
          type: 'estimate_approved',
          title: 'Estimate approved',
          message: `Estimate for ${estimate.jobDescription ?? 'a vehicle'} has been approved${source === 'customer' ? ' by the customer' : ''}.`,
          relatedEntityType: 'Estimate',
          relatedEntityId: id,
        } as unknown as Prisma.NotificationUncheckedCreateInput,
      });
    }

    return estimate;
  }

  /**
   * Estimate -> Job Card conversion (Phase 1 Section 1's "Estimate Approved
   * -> Job Card Created" event). Only valid from APPROVED. The JobCard is
   * created first (see JobCardsService.createFromEstimate) and CONVERTED is
   * only stamped once that succeeds — never flip the status ahead of the
   * JobCard actually existing.
   */
  async convertToJobCard(id: string) {
    const estimate = await this.assertExists(id);
    if (estimate.status !== EstimateStatus.APPROVED) {
      throw new BadRequestException('Estimate must be in APPROVED status to convert to a job card');
    }

    const full = await this.findOne(id);
    const jobCard = await this.jobCardsService.createFromEstimate(full);

    await this.prisma.forTenant().estimate.update({
      where: { id },
      data: { status: EstimateStatus.CONVERTED },
    });

    return jobCard;
  }

  private async transition(
    id: string,
    fromStatus: EstimateStatus,
    toStatus: EstimateStatus,
    extra: Record<string, unknown>,
  ) {
    const estimate = await this.assertExists(id);
    if (estimate.status !== fromStatus) {
      throw new BadRequestException(`Estimate must be in ${fromStatus} status to transition to ${toStatus}`);
    }
    return this.prisma.forTenant().estimate.update({
      where: { id },
      data: { status: toStatus, ...extra },
      include: {
        lineItems: true,
        customer: { select: CUSTOMER_SUMMARY_SELECT },
        vehicle: { select: VEHICLE_SUMMARY_SELECT },
      },
    });
  }

  private toLineItemRow(estimateId: string, dto: CreateEstimateLineItemDto) {
    const quantity = dto.quantity ?? 1;
    const gstRate = dto.gstRate ?? 18;
    return {
      estimateId,
      itemType: dto.itemType,
      description: dto.description,
      quantity,
      unitPrice: dto.unitPrice,
      gstRate,
      lineTotal: calculateLineTotal(quantity, dto.unitPrice),
    };
  }

  private async recalculate(estimateId: string) {
    const db = this.prisma.forTenant();
    const [lineItems, estimate] = await Promise.all([
      db.estimateLineItem.findMany({ where: { estimateId } }),
      db.estimate.findFirstOrThrow({ where: { id: estimateId } }),
    ]);
    const { subtotal, taxAmount, total } = calculateEstimateTotals(lineItems, estimate.discountAmount);
    return db.estimate.update({
      where: { id: estimateId },
      data: { subtotal, taxAmount, total },
      include: { lineItems: true },
    });
  }

  private async assertExists(id: string) {
    const estimate = await this.prisma.forTenant().estimate.findFirst({ where: { id, deletedAt: null } });
    if (!estimate) throw new NotFoundException('Estimate not found');
    return estimate;
  }

  private async assertLineItemExists(estimateId: string, itemId: string) {
    const item = await this.prisma.forTenant().estimateLineItem.findFirst({ where: { id: itemId, estimateId } });
    if (!item) throw new NotFoundException('Estimate line item not found');
    return item;
  }

  private async assertCustomerExists(customerId: string) {
    const customer = await this.prisma.forTenant().customer.findFirst({
      where: { id: customerId, deletedAt: null },
    });
    if (!customer) throw new NotFoundException('Customer not found for this estimate');
  }

  private async assertVehicleExists(vehicleId: string) {
    const vehicle = await this.prisma.forTenant().vehicle.findFirst({
      where: { id: vehicleId, deletedAt: null },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found for this estimate');
  }
}
