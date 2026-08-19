import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Estimate, EstimateLineItem, EstimateLineItemType, InventoryTxnType, JobCardStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../prisma/tenant-context';
import { generateSequenceNumber } from '../../common/sequence/generate-sequence-number';
import { isValidJobCardTransition } from './job-card-status-transitions';
import { resolveConvertedLabourLine } from './resolve-converted-labour-line';
import { hasSufficientStock } from './stock-guard';
import { CreateJobCardDto } from './dto/create-job-card.dto';
import { UpdateJobCardDto } from './dto/update-job-card.dto';
import { UpdateJobCardStatusDto } from './dto/update-job-card-status.dto';
import { ListJobCardsQueryDto } from './dto/list-job-cards-query.dto';
import { CreateJobCardLabourDto } from './dto/create-job-card-labour.dto';
import { CreateJobCardNoteDto } from './dto/create-job-card-note.dto';
import { CreateJobCardPartDto } from './dto/create-job-card-part.dto';

const VEHICLE_SUMMARY_SELECT = { id: true, registrationNo: true, brand: true, model: true } as const;
const CUSTOMER_SUMMARY_SELECT = { id: true, name: true, mobile: true } as const;
const JOB_CARD_INCLUDE = {
  vehicle: { select: VEHICLE_SUMMARY_SELECT },
  customer: { select: CUSTOMER_SUMMARY_SELECT },
  labourItems: true,
  parts: true,
  statusHistory: { orderBy: { changedAt: 'desc' as const } },
  notes: { orderBy: { createdAt: 'desc' as const } },
};
const TERMINAL_JOB_CARD_STATUSES: JobCardStatus[] = [JobCardStatus.DELIVERED, JobCardStatus.CANCELLED];

type EstimateForConversion = Estimate & { lineItems: EstimateLineItem[] };

@Injectable()
export class JobCardsService {
  constructor(private readonly prisma: PrismaService) {}

  // Casts below are needed because forTenant() injects tenantId into `data`
  // at runtime (see PrismaService) — the generated create types can't see that.
  async create(dto: CreateJobCardDto) {
    await this.assertVehicleExists(dto.vehicleId);
    await this.assertCustomerExists(dto.customerId);
    if (dto.technicianId) await this.assertTechnicianExists(dto.technicianId);
    if (dto.inspectionId) await this.assertInspectionExists(dto.inspectionId);

    const tenantId = TenantContext.requireTenantId();
    const db = this.prisma.forTenant();

    const jobCard = await db.$transaction(async (tx) => {
      const settings = await tx.tenantSettings.findUniqueOrThrow({ where: { tenantId } });
      // Cast needed because `tx` here is forTenant()'s extended-client
      // transaction type, structurally distinct from the generated
      // Prisma.TransactionClient type generateSequenceNumber expects —
      // functionally identical at runtime (verified: the extension does
      // propagate into $transaction), just a type-level mismatch.
      const jobCardNumber = await generateSequenceNumber(
        tx as unknown as Prisma.TransactionClient,
        tenantId,
        'JOB_CARD',
        settings.jobCardPrefix,
      );

      const created = await tx.jobCard.create({
        data: {
          vehicleId: dto.vehicleId,
          customerId: dto.customerId,
          inspectionId: dto.inspectionId,
          technicianId: dto.technicianId,
          serviceAdvisorId: dto.serviceAdvisorId,
          odometer: dto.odometer,
          complaint: dto.complaint,
          customerRequest: dto.customerRequest,
          estimatedWork: dto.estimatedWork,
          startAt: dto.startAt ? new Date(dto.startAt) : undefined,
          expectedDelivery: dto.expectedDelivery ? new Date(dto.expectedDelivery) : undefined,
          jobCardNumber,
          status: JobCardStatus.OPEN,
        } as unknown as Prisma.JobCardUncheckedCreateInput,
      });

      await tx.jobCardStatusHistory.create({
        data: {
          jobCardId: created.id,
          fromStatus: null,
          toStatus: JobCardStatus.OPEN,
        } as unknown as Prisma.JobCardStatusHistoryUncheckedCreateInput,
      });

      return created;
    });

    return this.findOne(jobCard.id);
  }

  /**
   * Estimate -> Job Card conversion (Phase 1 Section 1's "Estimate Approved
   * -> Job Card Created" event). Called from EstimatesService.convertToJobCard,
   * not exposed as its own /job-cards route — the public entry point is
   * POST /estimates/:id/convert-to-job-card.
   */
  async createFromEstimate(estimate: EstimateForConversion) {
    const tenantId = TenantContext.requireTenantId();
    const db = this.prisma.forTenant();

    const jobCard = await db.$transaction(async (tx) => {
      const settings = await tx.tenantSettings.findUniqueOrThrow({ where: { tenantId } });
      // Cast needed because `tx` here is forTenant()'s extended-client
      // transaction type, structurally distinct from the generated
      // Prisma.TransactionClient type generateSequenceNumber expects —
      // functionally identical at runtime (verified: the extension does
      // propagate into $transaction), just a type-level mismatch.
      const jobCardNumber = await generateSequenceNumber(
        tx as unknown as Prisma.TransactionClient,
        tenantId,
        'JOB_CARD',
        settings.jobCardPrefix,
      );

      const created = await tx.jobCard.create({
        data: {
          vehicleId: estimate.vehicleId,
          customerId: estimate.customerId,
          estimateId: estimate.id,
          complaint: estimate.jobDescription,
          jobCardNumber,
          status: JobCardStatus.OPEN,
        } as unknown as Prisma.JobCardUncheckedCreateInput,
      });

      await tx.jobCardStatusHistory.create({
        data: {
          jobCardId: created.id,
          fromStatus: null,
          toStatus: JobCardStatus.OPEN,
          notes: `Converted from estimate ${estimate.id}`,
        } as unknown as Prisma.JobCardStatusHistoryUncheckedCreateInput,
      });

      // PART/CONSUMABLE lines are intentionally skipped, not silently
      // dropped: Part/Inventory doesn't exist until Phase 6, so there's
      // nowhere yet to record stock consumption for them. The estimate
      // itself remains the record of what parts were priced; JobCardPart
      // will pick this up once it exists.
      const labourLines = estimate.lineItems.filter((li) => li.itemType === EstimateLineItemType.LABOUR);

      for (const line of labourLines) {
        // Best-effort catalogue match by description — see
        // resolveConvertedLabourLine for why this only affects
        // categorization, never the price charged.
        const matched = await tx.labourItem.findFirst({
          where: { description: line.description, isActive: true },
        });
        const { labourItemId, rate, gstRate } = resolveConvertedLabourLine(line, matched);
        const hours = line.quantity;

        await tx.jobCardLabour.create({
          data: {
            jobCardId: created.id,
            labourItemId,
            description: line.description,
            hours,
            rate,
            gstRate,
            lineTotal: new Prisma.Decimal(hours).mul(rate).toDecimalPlaces(2),
          } as unknown as Prisma.JobCardLabourUncheckedCreateInput,
        });
      }

      return created;
    });

    return this.findOne(jobCard.id);
  }

  async findAll(query: ListJobCardsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const db = this.prisma.forTenant();

    const where = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.technicianId ? { technicianId: query.technicianId } : {}),
      ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.search
        ? {
            OR: [
              { jobCardNumber: { contains: query.search, mode: 'insensitive' as const } },
              { complaint: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      db.jobCard.findMany({
        where,
        include: { vehicle: { select: VEHICLE_SUMMARY_SELECT }, customer: { select: CUSTOMER_SUMMARY_SELECT } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.jobCard.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string) {
    const jobCard = await this.prisma.forTenant().jobCard.findFirst({
      where: { id, deletedAt: null },
      include: JOB_CARD_INCLUDE,
    });
    if (!jobCard) throw new NotFoundException('Job card not found');
    return jobCard;
  }

  async update(id: string, dto: UpdateJobCardDto) {
    await this.assertExists(id);
    if (dto.technicianId) await this.assertTechnicianExists(dto.technicianId);
    if (dto.inspectionId) await this.assertInspectionExists(dto.inspectionId);

    return this.prisma.forTenant().jobCard.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.startAt ? { startAt: new Date(dto.startAt) } : {}),
        ...(dto.expectedDelivery ? { expectedDelivery: new Date(dto.expectedDelivery) } : {}),
      },
    });
  }

  async updateStatus(id: string, dto: UpdateJobCardStatusDto, changedByUserId: string) {
    const jobCard = await this.assertExists(id);
    if (!isValidJobCardTransition(jobCard.status, dto.status)) {
      throw new BadRequestException(`Cannot transition job card from ${jobCard.status} to ${dto.status}`);
    }

    const db = this.prisma.forTenant();
    await db.$transaction(async (tx) => {
      await tx.jobCard.update({
        where: { id },
        data: {
          status: dto.status,
          ...(dto.status === JobCardStatus.DELIVERED ? { actualDelivery: new Date() } : {}),
        },
      });

      await tx.jobCardStatusHistory.create({
        data: {
          jobCardId: id,
          fromStatus: jobCard.status,
          toStatus: dto.status,
          changedByUserId,
          notes: dto.notes,
        } as unknown as Prisma.JobCardStatusHistoryUncheckedCreateInput,
      });
    });

    return this.findOne(id);
  }

  async addLabour(jobCardId: string, dto: CreateJobCardLabourDto) {
    await this.assertExists(jobCardId);
    const labourItem = await this.prisma.forTenant().labourItem.findFirst({
      where: { id: dto.labourItemId, deletedAt: null, isActive: true },
    });
    if (!labourItem) throw new NotFoundException('Labour item not found');

    const hours = dto.hours ?? labourItem.standardHours;
    const rate = labourItem.labourRate;
    const gstRate = labourItem.gstRate;

    await this.prisma.forTenant().jobCardLabour.create({
      data: {
        jobCardId,
        labourItemId: labourItem.id,
        description: dto.description,
        hours,
        rate,
        gstRate,
        lineTotal: new Prisma.Decimal(hours).mul(rate).toDecimalPlaces(2),
      } as unknown as Prisma.JobCardLabourUncheckedCreateInput,
    });

    return this.findOne(jobCardId);
  }

  async removeLabour(jobCardId: string, lineId: string) {
    await this.assertLabourLineExists(jobCardId, lineId);
    await this.prisma.forTenant().jobCardLabour.delete({ where: { id: lineId } });
    return this.findOne(jobCardId);
  }

  /**
   * Stock deducts here, when the part is ADDED to the job card — not
   * deferred to invoicing (Invoicing doesn't exist until Phase 7, and
   * physically the part leaves the shelf when it's used, not when the
   * paperwork is generated). Deliberate deviation from the Phase 1 doc's
   * literal "Job Card Invoiced -> Inventory Reduced" wording — see the
   * same note on the JobCardPart model in schema.prisma.
   */
  async addPart(jobCardId: string, dto: CreateJobCardPartDto) {
    await this.assertExists(jobCardId);
    const db = this.prisma.forTenant();

    await db.$transaction(async (tx) => {
      const part = await tx.part.findFirst({ where: { id: dto.partId, deletedAt: null, isActive: true } });
      if (!part) throw new NotFoundException('Part not found');
      if (!hasSufficientStock(part.currentStock, dto.quantity)) {
        throw new BadRequestException('Insufficient stock');
      }

      // Guarded UPDATE (WHERE currentStock >= quantity) rather than acting
      // on the plain read above — Postgres evaluates the WHERE clause
      // atomically against the row's state at UPDATE time, so two
      // concurrent adds against the same part can't both pass the
      // above (now-stale) check and drive stock negative. The check above
      // is just a fast-fail for a clean error before any writes happen.
      const updated = await tx.part.updateMany({
        where: { id: part.id, currentStock: { gte: dto.quantity } },
        data: { currentStock: { decrement: dto.quantity } },
      });
      if (updated.count === 0) {
        throw new BadRequestException('Insufficient stock');
      }

      await tx.jobCardPart.create({
        data: {
          jobCardId,
          partId: part.id,
          quantity: dto.quantity,
          unitPrice: part.sellingPrice,
          gstRate: part.gstRate,
          lineTotal: new Prisma.Decimal(dto.quantity).mul(part.sellingPrice).toDecimalPlaces(2),
        } as unknown as Prisma.JobCardPartUncheckedCreateInput,
      });

      await tx.inventoryTransaction.create({
        data: {
          partId: part.id,
          type: InventoryTxnType.JOB_CARD_CONSUMPTION,
          quantity: -dto.quantity,
          refType: 'JobCard',
          refId: jobCardId,
        } as unknown as Prisma.InventoryTransactionUncheckedCreateInput,
      });
    });

    return this.findOne(jobCardId);
  }

  /** Reverses addPart symmetrically — restores stock, logs a positive RETURN transaction. */
  async removePart(jobCardId: string, lineId: string) {
    const jobCard = await this.assertExists(jobCardId);
    if (TERMINAL_JOB_CARD_STATUSES.includes(jobCard.status)) {
      throw new BadRequestException(`Cannot remove a part from a job card that is ${jobCard.status}`);
    }
    const line = await this.assertPartLineExists(jobCardId, lineId);
    const db = this.prisma.forTenant();

    await db.$transaction(async (tx) => {
      await tx.jobCardPart.delete({ where: { id: lineId } });
      await tx.part.update({
        where: { id: line.partId },
        data: { currentStock: { increment: line.quantity } },
      });
      await tx.inventoryTransaction.create({
        data: {
          partId: line.partId,
          type: InventoryTxnType.RETURN,
          quantity: line.quantity,
          refType: 'JobCard',
          refId: jobCardId,
        } as unknown as Prisma.InventoryTransactionUncheckedCreateInput,
      });
    });

    return this.findOne(jobCardId);
  }

  async addNote(jobCardId: string, dto: CreateJobCardNoteDto, authorId: string) {
    await this.assertExists(jobCardId);
    await this.prisma.forTenant().jobCardNote.create({
      data: { jobCardId, authorId, note: dto.note } as unknown as Prisma.JobCardNoteUncheckedCreateInput,
    });
    return this.findOne(jobCardId);
  }

  async getStatusHistory(jobCardId: string) {
    await this.assertExists(jobCardId);
    return this.prisma.forTenant().jobCardStatusHistory.findMany({
      where: { jobCardId },
      orderBy: { changedAt: 'desc' },
    });
  }

  private async assertExists(id: string) {
    const jobCard = await this.prisma.forTenant().jobCard.findFirst({ where: { id, deletedAt: null } });
    if (!jobCard) throw new NotFoundException('Job card not found');
    return jobCard;
  }

  private async assertLabourLineExists(jobCardId: string, lineId: string) {
    const line = await this.prisma.forTenant().jobCardLabour.findFirst({ where: { id: lineId, jobCardId } });
    if (!line) throw new NotFoundException('Job card labour line not found');
    return line;
  }

  private async assertPartLineExists(jobCardId: string, lineId: string) {
    const line = await this.prisma.forTenant().jobCardPart.findFirst({ where: { id: lineId, jobCardId } });
    if (!line) throw new NotFoundException('Job card part line not found');
    return line;
  }

  private async assertVehicleExists(vehicleId: string) {
    const vehicle = await this.prisma.forTenant().vehicle.findFirst({ where: { id: vehicleId, deletedAt: null } });
    if (!vehicle) throw new NotFoundException('Vehicle not found for this job card');
  }

  private async assertCustomerExists(customerId: string) {
    const customer = await this.prisma.forTenant().customer.findFirst({
      where: { id: customerId, deletedAt: null },
    });
    if (!customer) throw new NotFoundException('Customer not found for this job card');
  }

  private async assertTechnicianExists(technicianId: string) {
    const technician = await this.prisma.forTenant().technician.findFirst({ where: { id: technicianId } });
    if (!technician) throw new NotFoundException('Technician not found for this job card');
  }

  private async assertInspectionExists(inspectionId: string) {
    const inspection = await this.prisma.forTenant().inspection.findFirst({ where: { id: inspectionId } });
    if (!inspection) throw new NotFoundException('Inspection not found for this job card');
  }
}
