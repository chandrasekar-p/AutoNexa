import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WarrantyClaimStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../prisma/tenant-context';
import { MessagingService } from '../messaging/messaging.service';
import { warrantyClaimDecidedMessage } from '../messaging/templates';
import { computeWarrantyStatus } from './warranty-status';
import { isValidWarrantyClaimTransition } from './warranty-claim-status-transitions';
import { CreateWarrantyClaimDto } from './dto/create-warranty-claim.dto';
import { UpdateWarrantyClaimDto } from './dto/update-warranty-claim.dto';
import { ListWarrantyClaimsQueryDto } from './dto/list-warranty-claims-query.dto';

const CLAIM_INCLUDE = {
  claimJobCard: { select: { id: true, jobCardNumber: true, vehicleId: true, customerId: true } },
  originalJobCardPart: { include: { part: { select: { id: true, partNumber: true, name: true } }, jobCard: { select: { id: true, jobCardNumber: true, actualDelivery: true, odometer: true } } } },
  originalJobCardLabour: { include: { labourItem: { select: { id: true, code: true, description: true } }, jobCard: { select: { id: true, jobCardNumber: true, actualDelivery: true, odometer: true } } } },
  approvedByUser: { select: { id: true, name: true } },
} as const;

@Injectable()
export class WarrantyClaimsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
  ) {}

  async create(dto: CreateWarrantyClaimDto) {
    const hasOne = !!dto.originalJobCardPartId !== !!dto.originalJobCardLabourId;
    if (!hasOne) {
      throw new BadRequestException('Provide exactly one of originalJobCardPartId or originalJobCardLabourId');
    }

    const db = this.prisma.forTenant();
    const claimJobCard = await db.jobCard.findFirst({ where: { id: dto.claimJobCardId, deletedAt: null } });
    if (!claimJobCard) throw new NotFoundException('Job card not found');

    const original = dto.originalJobCardPartId
      ? await db.jobCardPart.findFirst({
          where: { id: dto.originalJobCardPartId },
          include: { part: true, jobCard: { select: { vehicleId: true, actualDelivery: true, odometer: true } } },
        })
      : await db.jobCardLabour.findFirst({
          where: { id: dto.originalJobCardLabourId },
          include: { labourItem: true, jobCard: { select: { vehicleId: true, actualDelivery: true, odometer: true } } },
        });
    if (!original) throw new NotFoundException('Original job card line not found');

    if (original.jobCard.vehicleId !== claimJobCard.vehicleId) {
      throw new BadRequestException('The original line and the claim job card must be for the same vehicle');
    }

    const vehicle = await db.vehicle.findFirstOrThrow({ where: { id: claimJobCard.vehicleId } });
    const warrantyKm = 'warrantyKm' in original ? original.warrantyKm : null;
    const status = computeWarrantyStatus(
      original.jobCard.actualDelivery,
      original.warrantyMonths,
      warrantyKm,
      original.jobCard.odometer,
      vehicle.odometerReading,
    );
    if (!status.isActive) {
      throw new BadRequestException('This line is no longer under warranty — its coverage has expired');
    }

    return db.warrantyClaim.create({
      data: {
        claimJobCardId: dto.claimJobCardId,
        originalJobCardPartId: dto.originalJobCardPartId,
        originalJobCardLabourId: dto.originalJobCardLabourId,
        resolutionNotes: dto.resolutionNotes,
      } as unknown as Prisma.WarrantyClaimUncheckedCreateInput,
      include: CLAIM_INCLUDE,
    });
  }

  async findAll(query: ListWarrantyClaimsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const db = this.prisma.forTenant();

    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.vehicleId ? { claimJobCard: { vehicleId: query.vehicleId } } : {}),
    };

    const [items, total] = await Promise.all([
      db.warrantyClaim.findMany({ where, include: CLAIM_INCLUDE, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      db.warrantyClaim.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string) {
    const claim = await this.prisma.forTenant().warrantyClaim.findFirst({ where: { id }, include: CLAIM_INCLUDE });
    if (!claim) throw new NotFoundException('Warranty claim not found');
    return claim;
  }

  /** Approve/reject/resolve — gated on warranty-claim:update (manager-only by default, see default-role-grants.ts), distinct from :create which any technician/service advisor has. */
  async update(id: string, dto: UpdateWarrantyClaimDto, approvedByUserId: string) {
    const claim = await this.assertExists(id);

    if (dto.status && !isValidWarrantyClaimTransition(claim.status, dto.status)) {
      throw new BadRequestException(`Cannot transition warranty claim from ${claim.status} to ${dto.status}`);
    }

    const isDecision = dto.status === WarrantyClaimStatus.APPROVED || dto.status === WarrantyClaimStatus.REJECTED;

    const updated = await this.prisma.forTenant().warrantyClaim.update({
      where: { id },
      data: {
        ...dto,
        ...(isDecision ? { approvedByUserId, approvedAt: new Date() } : {}),
      },
      include: CLAIM_INCLUDE,
    });

    if (isDecision) {
      await this.sendDecisionNotification(updated);
    }

    return updated;
  }

  /** Best-effort — see MessagingService.notifyCustomer's doc comment on why this never throws. */
  private async sendDecisionNotification(claim: Awaited<ReturnType<WarrantyClaimsService['findOne']>>): Promise<void> {
    const tenantId = TenantContext.requireTenantId();
    const db = this.prisma.forTenant();
    const customer = await db.customer.findUnique({ where: { id: claim.claimJobCard.customerId } });
    if (!customer) return;

    const tenant = await this.prisma.platform.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    const itemLabel = claim.originalJobCardPart?.part.name ?? claim.originalJobCardLabour?.labourItem?.description ?? claim.originalJobCardLabour?.description ?? 'the reported item';

    const content = warrantyClaimDecidedMessage({
      workshopName: tenant?.name ?? 'AutoNexa',
      customerName: customer.name,
      itemLabel,
      approved: claim.status === WarrantyClaimStatus.APPROVED,
      isBillable: claim.isBillable,
    });
    await this.messaging.notifyCustomer(
      tenantId,
      'warranty-claim.decided',
      { email: customer.email, mobile: customer.mobile, customerId: customer.id },
      content,
      { type: 'WarrantyClaim', id: claim.id },
    );
  }

  private async assertExists(id: string) {
    const claim = await this.prisma.forTenant().warrantyClaim.findFirst({ where: { id } });
    if (!claim) throw new NotFoundException('Warranty claim not found');
    return claim;
  }
}
