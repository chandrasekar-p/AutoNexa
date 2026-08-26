import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { JobCardStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';
import { ListTechniciansQueryDto } from './dto/list-technicians-query.dto';
import { computeTechnicianPerformance } from './technician-performance';
import { computeWorkloadPercent, deriveTechnicianAvailability } from './technician-workload';

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

    const openJobCardFilter = { status: { notIn: TERMINAL_STATUSES }, deletedAt: null } as const;

    const where: Prisma.TechnicianWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.specialisation ? { specialisation: query.specialisation } : {}),
      ...(query.skill ? { skills: { has: query.skill } } : {}),
      ...(query.workload === 'available'
        ? { status: 'ACTIVE', jobCards: { none: openJobCardFilter } }
        : query.workload === 'busy'
          ? { status: 'ACTIVE', jobCards: { some: openJobCardFilter } }
          : {}),
      ...(query.search
        ? {
            OR: [
              { employeeId: { contains: query.search, mode: 'insensitive' as const } },
              { specialisation: { contains: query.search, mode: 'insensitive' as const } },
              { user: { name: { contains: query.search, mode: 'insensitive' as const } } },
              { skills: { has: query.search } },
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

    const ids = items.map((t) => t.id);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Two batch queries covering every row on this page, not N+1 — the
    // list only needs the light jobsOpen/todayCount subset, unlike the
    // full computeTechnicianPerformance() the detail page uses.
    const [openCounts, todayCounts] = await Promise.all([
      ids.length > 0
        ? db.jobCard.groupBy({ by: ['technicianId'], where: { technicianId: { in: ids }, ...openJobCardFilter }, _count: true })
        : Promise.resolve([]),
      ids.length > 0
        ? db.jobCard.groupBy({
            by: ['technicianId'],
            where: { technicianId: { in: ids }, deletedAt: null, updatedAt: { gte: todayStart, lt: todayEnd } },
            _count: true,
          })
        : Promise.resolve([]),
    ]);
    const openById = new Map(openCounts.map((c) => [c.technicianId, c._count]));
    const todayById = new Map(todayCounts.map((c) => [c.technicianId, c._count]));

    return {
      items: items.map((t) => {
        const jobsOpen = openById.get(t.id) ?? 0;
        return {
          ...t,
          jobsOpen,
          todayCount: todayById.get(t.id) ?? 0,
          workloadPercent: computeWorkloadPercent(jobsOpen, t.maxConcurrentJobs),
          availability: deriveTechnicianAvailability(t.status, jobsOpen),
        };
      }),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** KPI cards for the Technicians page — a single lightweight pass, not 5 separate full scans. */
  async summary() {
    const db = this.prisma.forTenant();
    const technicians = await db.technician.findMany({ select: { id: true, status: true } });
    const ids = technicians.map((t) => t.id);

    const openCounts =
      ids.length > 0
        ? await db.jobCard.groupBy({
            by: ['technicianId'],
            where: { technicianId: { in: ids }, status: { notIn: TERMINAL_STATUSES }, deletedAt: null },
            _count: true,
          })
        : [];
    const openById = new Map(openCounts.map((c) => [c.technicianId, c._count]));

    let active = 0;
    let available = 0;
    let onJob = 0;
    let onLeave = 0;
    let inactive = 0;
    for (const t of technicians) {
      if (t.status === 'ACTIVE') active++;
      const availability = deriveTechnicianAvailability(t.status, openById.get(t.id) ?? 0);
      if (availability === 'AVAILABLE') available++;
      else if (availability === 'ON_JOB') onJob++;
      else if (availability === 'ON_LEAVE') onLeave++;
      else inactive++;
    }

    return { active, available, onJob, onLeave, inactive };
  }

  /**
   * Self-view for a Technician-role caller — no @Permissions guard on the
   * route (see the controller), so a technician can see their own profile
   * without a blanket technician:read grant that would also expose every
   * other technician's data. 404 (not 403) when the caller isn't a
   * technician at all, same "don't reveal more than necessary" idiom used
   * elsewhere in this codebase.
   */
  async findByUserId(userId: string) {
    const technician = await this.prisma.forTenant().technician.findFirst({
      where: { userId },
      include: { user: { select: USER_SUMMARY_SELECT } },
    });
    if (!technician) throw new NotFoundException('No technician profile for this user');
    return this.withDerivedFields(technician);
  }

  /**
   * Base profile plus computed workload — jobsOpen/jobsCompleted/
   * totalLabourHours/revenueGenerated are all derived on read, never
   * stored redundantly. revenueGenerated closes the TODO left here since
   * Phase 5: sum of JobCardLabour.lineTotal across this technician's job
   * cards where a PAID Invoice now exists — labour revenue attributed to
   * the technician, not parts (parts aren't "generated" by their labour).
   */
  async findOne(id: string) {
    const technician = await this.assertExists(id);
    return this.withDerivedFields(technician);
  }

  /** Shared by findOne/findByUserId — full performance stats plus the same todayCount/workloadPercent/availability derivation the list uses, so a technician's own profile page and its list row can never disagree. */
  private async withDerivedFields<T extends { id: string; status: Prisma.TechnicianGetPayload<object>['status']; maxConcurrentJobs: number }>(
    technician: T,
  ) {
    const db = this.prisma.forTenant();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const [performance, todayCount] = await Promise.all([
      computeTechnicianPerformance(db, technician.id),
      db.jobCard.count({ where: { technicianId: technician.id, deletedAt: null, updatedAt: { gte: todayStart, lt: todayEnd } } }),
    ]);

    return {
      ...technician,
      ...performance,
      todayCount,
      workloadPercent: computeWorkloadPercent(performance.jobsOpen, technician.maxConcurrentJobs),
      availability: deriveTechnicianAvailability(technician.status, performance.jobsOpen),
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
