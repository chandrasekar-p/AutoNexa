import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Estimate, EstimateLineItem, EstimateLineItemType, InventoryTxnType, JobCardStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../prisma/tenant-context';
import { generateSequenceNumber } from '../../common/sequence/generate-sequence-number';
import { InvoicesService } from '../invoices/invoices.service';
import { MessagingService } from '../messaging/messaging.service';
import { jobCardReadyMessage } from '../messaging/templates';
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
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { isPackageRedeemable } from '../service-packages/package-eligibility';

const VEHICLE_SUMMARY_SELECT = { id: true, registrationNo: true, brand: true, model: true } as const;
const CUSTOMER_SUMMARY_SELECT = { id: true, name: true, mobile: true, email: true } as const;
const JOB_CARD_INCLUDE = {
  vehicle: { select: VEHICLE_SUMMARY_SELECT },
  customer: { select: CUSTOMER_SUMMARY_SELECT },
  labourItems: true,
  parts: true,
  statusHistory: { orderBy: { changedAt: 'desc' as const } },
  notes: { orderBy: { createdAt: 'desc' as const } },
  // Lightweight reference so the frontend can link straight to an
  // already-generated invoice instead of only surfacing "an invoice
  // already exists for this job card" with nowhere to go from there.
  invoice: { select: { id: true, invoiceNumber: true, status: true, grandTotal: true } },
};
const TERMINAL_JOB_CARD_STATUSES: JobCardStatus[] = [JobCardStatus.DELIVERED, JobCardStatus.CANCELLED];

type EstimateForConversion = Estimate & { lineItems: EstimateLineItem[] };

@Injectable()
export class JobCardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoicesService: InvoicesService,
    private readonly messaging: MessagingService,
  ) {}

  // Casts below are needed because forTenant() injects tenantId into `data`
  // at runtime (see PrismaService) — the generated create types can't see that.
  async create(dto: CreateJobCardDto) {
    await this.assertVehicleExists(dto.vehicleId);
    await this.assertCustomerExists(dto.customerId);
    if (dto.technicianId) await this.assertTechnicianExists(dto.technicianId);
    if (dto.inspectionId) await this.assertInspectionExists(dto.inspectionId);
    if (dto.redeemedPackageId) await this.assertPackageRedeemable(dto.redeemedPackageId, dto.customerId, dto.vehicleId);

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
          redeemedPackageId: dto.redeemedPackageId,
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
      // dropped: adding parts to a job card is a deliberate manual step
      // (POST /job-cards/:id/parts) because it deducts real stock at that
      // moment (see addPart below) — estimate line items are just priced
      // text, not a stock-backed commitment, so conversion can't safely
      // auto-consume inventory on the technician's behalf. The estimate
      // itself remains the record of what parts were priced; a technician
      // adds them to the job card explicitly once work actually starts.
      const labourLines = estimate.lineItems.filter((li) => li.itemType === EstimateLineItemType.LABOUR);

      for (const line of labourLines) {
        // Best-effort catalogue match by description — see
        // resolveConvertedLabourLine for why this only affects
        // categorization, never the price charged.
        const matched = await tx.labourItem.findFirst({
          where: { description: line.description, isActive: true },
        });
        const { labourItemId, rate, gstRate, hsnSac } = resolveConvertedLabourLine(line, matched);
        const hours = line.quantity;

        await tx.jobCardLabour.create({
          data: {
            jobCardId: created.id,
            labourItemId,
            description: line.description,
            hours,
            rate,
            gstRate,
            hsnSac,
            lineTotal: new Prisma.Decimal(hours).mul(rate).toDecimalPlaces(2),
          } as unknown as Prisma.JobCardLabourUncheckedCreateInput,
        });
      }

      return created;
    });

    return this.findOne(jobCard.id);
  }

  async findAll(query: ListJobCardsQueryDto, currentUserId: string) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const db = this.prisma.forTenant();
    const scope = await this.getTechnicianScope(currentUserId);

    const where = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      // A technician is force-scoped to their own jobCards regardless of
      // what technicianId (if any) the client asked for — see
      // getTechnicianScope's doc comment.
      ...(scope ? { technicianId: scope } : query.technicianId ? { technicianId: query.technicianId } : {}),
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

  /**
   * `currentUserId` is optional here because findOne doubles as the
   * "refetch the full joined view" tail call inside create/update/etc,
   * where the caller already ran assertExists (which does the same scope
   * check) earlier in the same method — re-checking there would just be a
   * redundant technician lookup. The controller's own GET /job-cards/:id
   * always passes it, since that's a real external entry point a
   * technician could probe with someone else's job card id.
   */
  async findOne(id: string, currentUserId?: string) {
    const jobCard = await this.prisma.forTenant().jobCard.findFirst({
      where: { id, deletedAt: null },
      include: JOB_CARD_INCLUDE,
    });
    if (!jobCard) throw new NotFoundException('Job card not found');
    if (currentUserId) await this.assertTechnicianAccess(jobCard, currentUserId);
    return jobCard;
  }

  async update(id: string, dto: UpdateJobCardDto, currentUserId: string) {
    const jobCard = await this.assertExists(id, currentUserId);
    if (dto.technicianId) await this.assertTechnicianExists(dto.technicianId);
    if (dto.inspectionId) await this.assertInspectionExists(dto.inspectionId);
    if (dto.redeemedPackageId) await this.assertPackageRedeemable(dto.redeemedPackageId, jobCard.customerId, jobCard.vehicleId);

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
    const jobCard = await this.assertExists(id, changedByUserId);
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

      // Visit consumption happens once per job card, at actual completion —
      // not per labour/part line added, and not at invoice generation
      // (a job card can be delivered without ever being invoiced, e.g.
      // warranty work). Guarded UPDATE, same shape as stock-guard.ts's
      // part-stock decrement: the WHERE clause is re-checked atomically at
      // UPDATE time, so two concurrent requests can't both pass a stale
      // "visits remaining" read and drive visitsUsed past the limit.
      if (dto.status === JobCardStatus.DELIVERED && jobCard.redeemedPackageId) {
        const pkg = await tx.customerServicePackage.findUniqueOrThrow({ where: { id: jobCard.redeemedPackageId } });
        const guardedWhere =
          pkg.visitLimit === null
            ? { id: jobCard.redeemedPackageId, status: 'ACTIVE' as const }
            : { id: jobCard.redeemedPackageId, status: 'ACTIVE' as const, visitsUsed: { lt: pkg.visitLimit } };
        const updated = await tx.customerServicePackage.updateMany({ where: guardedWhere, data: { visitsUsed: { increment: 1 } } });
        if (updated.count === 0) {
          throw new BadRequestException('This service package is no longer active or has no visits remaining');
        }
      }

      if (dto.status === JobCardStatus.READY_FOR_DELIVERY) {
        // Recipient is the job card's service advisor if one is assigned;
        // otherwise broadcast (userId: null) so any tenant staff member
        // sees it — there's no notification-routing/escalation concept in
        // this system yet, and most workshops are small enough that
        // "someone" picking this up is an acceptable fallback.
        await tx.notification.create({
          data: {
            userId: jobCard.serviceAdvisorId,
            type: 'vehicle_ready',
            title: 'Vehicle ready for delivery',
            message: `Job card ${jobCard.jobCardNumber} is ready for delivery.`,
            relatedEntityType: 'JobCard',
            relatedEntityId: id,
          } as unknown as Prisma.NotificationUncheckedCreateInput,
        });
      }
    });

    const updated = await this.findOne(id);

    if (dto.status === JobCardStatus.READY_FOR_DELIVERY) {
      await this.sendReadyForPickup(updated);
    }

    return updated;
  }

  /** Best-effort — see MessagingService.notifyCustomer's doc comment on why this never throws. */
  private async sendReadyForPickup(jobCard: {
    id: string;
    jobCardNumber: string;
    customer: { id: string; name: string; mobile: string; email: string | null };
    vehicle: { registrationNo: string; brand: string; model: string };
  }) {
    const tenantId = TenantContext.requireTenantId();
    const tenant = await this.prisma.platform.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });

    const content = jobCardReadyMessage({
      workshopName: tenant?.name ?? 'AutoNexa',
      customerName: jobCard.customer.name,
      vehicleLabel: `${jobCard.vehicle.registrationNo} ${jobCard.vehicle.brand} ${jobCard.vehicle.model}`,
      jobCardNumber: jobCard.jobCardNumber,
    });

    await this.messaging.notifyCustomer(
      tenantId,
      'job-card.ready',
      { email: jobCard.customer.email, mobile: jobCard.customer.mobile, customerId: jobCard.customer.id },
      content,
      { type: 'JobCard', id: jobCard.id },
    );

    await this.messaging.notifyOps(
      tenantId,
      'job-card.ready',
      `Ready for pickup: ${jobCard.jobCardNumber} — ${jobCard.customer.name} — ${jobCard.vehicle.registrationNo}`,
      { type: 'JobCard', id: jobCard.id },
    );
  }

  async addLabour(jobCardId: string, dto: CreateJobCardLabourDto, currentUserId: string) {
    await this.assertExists(jobCardId, currentUserId);
    const labourItem = await this.prisma.forTenant().labourItem.findFirst({
      where: { id: dto.labourItemId, deletedAt: null, isActive: true },
    });
    if (!labourItem) throw new NotFoundException('Labour item not found');
    if (dto.warrantyClaimId) await this.assertClaimBelongsToJobCard(dto.warrantyClaimId, jobCardId);

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
        hsnSac: labourItem.sacCode,
        lineTotal: new Prisma.Decimal(hours).mul(rate).toDecimalPlaces(2),
        // Snapshotted at add time — a later edit to LabourItem never
        // retroactively changes a job already performed, same discipline
        // as rate/gstRate above.
        warrantyMonths: labourItem.warrantyPeriodMonths,
        warrantyClaimId: dto.warrantyClaimId,
      } as unknown as Prisma.JobCardLabourUncheckedCreateInput,
    });

    return this.findOne(jobCardId);
  }

  async removeLabour(jobCardId: string, lineId: string, currentUserId: string) {
    await this.assertExists(jobCardId, currentUserId);
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
  async addPart(jobCardId: string, dto: CreateJobCardPartDto, currentUserId: string) {
    await this.assertExists(jobCardId, currentUserId);
    if (dto.warrantyClaimId) await this.assertClaimBelongsToJobCard(dto.warrantyClaimId, jobCardId);
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
          hsnSac: part.hsnCode,
          lineTotal: new Prisma.Decimal(dto.quantity).mul(part.sellingPrice).toDecimalPlaces(2),
          // Snapshotted at add time — a later edit to Part never
          // retroactively changes a job already done, same discipline as
          // sellingPrice/gstRate above.
          warrantyMonths: part.warrantyPeriodMonths,
          warrantyKm: part.warrantyKm,
          warrantyClaimId: dto.warrantyClaimId,
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
  async removePart(jobCardId: string, lineId: string, currentUserId: string) {
    const jobCard = await this.assertExists(jobCardId, currentUserId);
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
    await this.assertExists(jobCardId, authorId);
    await this.prisma.forTenant().jobCardNote.create({
      data: { jobCardId, authorId, note: dto.note } as unknown as Prisma.JobCardNoteUncheckedCreateInput,
    });
    return this.findOne(jobCardId);
  }

  async getStatusHistory(jobCardId: string, currentUserId: string) {
    await this.assertExists(jobCardId, currentUserId);
    return this.prisma.forTenant().jobCardStatusHistory.findMany({
      where: { jobCardId },
      orderBy: { changedAt: 'desc' },
    });
  }

  /**
   * Public entry point is POST /job-cards/:id/generate-invoice — the
   * actual generation logic (status guard, duplicate check, GST split,
   * line-item snapshotting) lives in InvoicesService since Invoice isn't
   * owned by this module, same shape as Estimate -> JobCard conversion.
   */
  generateInvoice(jobCardId: string, dto: GenerateInvoiceDto) {
    return this.invoicesService.generateFromJobCard(jobCardId, dto);
  }

  private async assertExists(id: string, currentUserId: string) {
    const jobCard = await this.prisma.forTenant().jobCard.findFirst({ where: { id, deletedAt: null } });
    if (!jobCard) throw new NotFoundException('Job card not found');
    await this.assertTechnicianAccess(jobCard, currentUserId);
    return jobCard;
  }

  /**
   * A user who is themselves a technician (has a Technician row linked to
   * their userId) only sees/touches their own assigned job cards — read
   * and write, across list, detail, status changes, and labour/part/note
   * mutations. Non-technician roles (Owner/Manager/Receptionist/Accountant/
   * Service Advisor) resolve to no scope here and are unaffected, same as
   * before. This is enforced here in the service, not just hidden by the
   * frontend board — a technician calling the API directly with another
   * technician's job card id must not be able to read or mutate it either.
   */
  private async getTechnicianScope(userId: string): Promise<string | null> {
    const technician = await this.prisma.forTenant().technician.findUnique({ where: { userId } });
    return technician?.id ?? null;
  }

  /**
   * Cross-technician access reads as "not found," not "forbidden" — same
   * idiom PrismaService.forTenant() already uses for cross-tenant access,
   * so this doesn't reveal that a job card with this id exists at all.
   */
  private async assertTechnicianAccess(jobCard: { technicianId: string | null }, currentUserId: string) {
    const scope = await this.getTechnicianScope(currentUserId);
    if (scope && jobCard.technicianId !== scope) {
      throw new NotFoundException('Job card not found');
    }
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

  /** A job card can only redeem a package sold to the SAME customer+vehicle, and only while it's still active with visits remaining — a fast-fail check; the guarded visit-decrement at DELIVERED (see updateStatus) is the actual concurrency-safe enforcement. */
  private async assertPackageRedeemable(packageId: string, customerId: string, vehicleId: string) {
    const pkg = await this.prisma.forTenant().customerServicePackage.findFirst({ where: { id: packageId, customerId, vehicleId } });
    if (!pkg) throw new NotFoundException('Service package not found for this customer and vehicle');
    if (!isPackageRedeemable(pkg.status, pkg.endDate, pkg.visitsUsed, pkg.visitLimit)) {
      throw new BadRequestException('This service package is not active or has no visits remaining');
    }
  }

  /** A line can only be tagged against a claim raised on THIS SAME job card — prevents accidentally (or maliciously) marking a line free against an unrelated vehicle's claim. */
  private async assertClaimBelongsToJobCard(warrantyClaimId: string, jobCardId: string) {
    const claim = await this.prisma.forTenant().warrantyClaim.findFirst({ where: { id: warrantyClaimId, claimJobCardId: jobCardId } });
    if (!claim) throw new NotFoundException('Warranty claim not found on this job card');
  }
}
