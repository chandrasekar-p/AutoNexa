import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EstimateStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JobCardsService } from '../job-cards/job-cards.service';
import { CreateEstimateDto } from './dto/create-estimate.dto';
import { UpdateEstimateDto } from './dto/update-estimate.dto';
import { ListEstimatesQueryDto } from './dto/list-estimates-query.dto';
import { CreateEstimateLineItemDto } from './dto/create-estimate-line-item.dto';
import { UpdateEstimateLineItemDto } from './dto/update-estimate-line-item.dto';
import { calculateEstimateTotals, calculateLineTotal } from './estimate-totals';

@Injectable()
export class EstimatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobCardsService: JobCardsService,
  ) {}

  // Casts below are needed because forTenant() injects tenantId into `data`
  // at runtime (see PrismaService) — the generated create types can't see that.
  async create(dto: CreateEstimateDto) {
    await this.assertCustomerExists(dto.customerId);
    await this.assertVehicleExists(dto.vehicleId);
    const db = this.prisma.forTenant();

    const estimate = await db.estimate.create({
      data: {
        customerId: dto.customerId,
        vehicleId: dto.vehicleId,
        jobDescription: dto.jobDescription,
        discountAmount: dto.discountAmount ?? 0,
      } as unknown as Prisma.EstimateUncheckedCreateInput,
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
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { jobDescription: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [items, total] = await Promise.all([
      db.estimate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.estimate.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
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

  async approve(id: string) {
    return this.transition(id, EstimateStatus.SENT, EstimateStatus.APPROVED, { approvedAt: new Date() });
  }

  async reject(id: string) {
    return this.transition(id, EstimateStatus.SENT, EstimateStatus.REJECTED, { rejectedAt: new Date() });
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
      include: { lineItems: true },
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
