import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { JobCardStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';
import { ListTechniciansQueryDto } from './dto/list-technicians-query.dto';

const USER_SUMMARY_SELECT = { id: true, name: true, email: true, phone: true } as const;
const TERMINAL_STATUSES = [JobCardStatus.DELIVERED, JobCardStatus.CANCELLED];

@Injectable()
export class TechniciansService {
  constructor(private readonly prisma: PrismaService) {}

  // Cast needed because forTenant() injects tenantId into `data` at
  // runtime (see PrismaService) — the generated create type can't see that.
  async create(dto: CreateTechnicianDto) {
    await this.assertUserExists(dto.userId);
    await this.assertUserNotAlreadyTechnician(dto.userId);
    return this.prisma.forTenant().technician.create({
      data: dto as unknown as Prisma.TechnicianUncheckedCreateInput,
    });
  }

  async findAll(query: ListTechniciansQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const db = this.prisma.forTenant();

    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { employeeId: { contains: query.search, mode: 'insensitive' as const } },
              { specialisation: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      db.technician.findMany({
        where,
        include: { user: { select: USER_SUMMARY_SELECT } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.technician.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /**
   * Base profile plus computed workload — jobsOpen/jobsCompleted/
   * totalLabourHours are derived on read, never stored redundantly.
   * Revenue generated is deferred to Phase 7 (Invoicing): there's no paid-
   * invoice data to sum against yet.
   */
  async findOne(id: string) {
    const technician = await this.assertExists(id);
    const db = this.prisma.forTenant();

    const [jobsOpen, jobsCompleted, hoursAgg] = await Promise.all([
      db.jobCard.count({
        where: { technicianId: id, deletedAt: null, status: { notIn: TERMINAL_STATUSES } },
      }),
      db.jobCard.count({ where: { technicianId: id, deletedAt: null, status: JobCardStatus.DELIVERED } }),
      db.jobCardLabour.aggregate({ where: { jobCard: { technicianId: id } }, _sum: { hours: true } }),
    ]);

    return {
      ...technician,
      jobsOpen,
      jobsCompleted,
      totalLabourHours: hoursAgg._sum.hours ?? new Prisma.Decimal(0),
      // TODO(Phase 7): revenueGenerated once Invoicing exists — sum of
      // paid invoice totals across this technician's job cards.
    };
  }

  async update(id: string, dto: UpdateTechnicianDto) {
    await this.assertExists(id);
    return this.prisma.forTenant().technician.update({ where: { id }, data: dto });
  }

  private async assertExists(id: string) {
    const technician = await this.prisma.forTenant().technician.findFirst({
      where: { id },
      include: { user: { select: USER_SUMMARY_SELECT } },
    });
    if (!technician) throw new NotFoundException('Technician not found');
    return technician;
  }

  private async assertUserExists(userId: string) {
    const user = await this.prisma.forTenant().user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found for this technician');
  }

  private async assertUserNotAlreadyTechnician(userId: string) {
    const existing = await this.prisma.forTenant().technician.findFirst({ where: { userId } });
    if (existing) throw new ConflictException('This user is already a technician');
  }
}
