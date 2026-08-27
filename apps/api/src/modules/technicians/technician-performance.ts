import { InvoiceStatus, JobCardStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const TERMINAL_STATUSES = [JobCardStatus.DELIVERED, JobCardStatus.CANCELLED];

export interface TechnicianPerformance {
  jobsOpen: number;
  jobsCompleted: number;
  totalLabourHours: Prisma.Decimal;
  revenueGenerated: Prisma.Decimal;
  /** Today-scoped and lifetime-average stats — always computed fresh regardless of the `range` param below, which only scopes the four fields above. */
  completedToday: number;
  /** Sum of hours on labour lines belonging to job cards this technician touched today (JobCard.updatedAt, not the line's own — JobCardLabour has no createdAt/updatedAt of its own). A coarse-but-real proxy for "how much logged work today," not a fabricated number. */
  hoursToday: Prisma.Decimal;
  /** Mean (actualDelivery - createdAt) in days across this technician's lifetime DELIVERED job cards. Null, not 0, when they have none yet — a real "no data," not a fabricated average. */
  avgCompletionDays: number | null;
}

export interface TechnicianPerformanceRange {
  from?: Date;
  to?: Date;
}

/**
 * jobsOpen/jobsCompleted/totalLabourHours/revenueGenerated for one
 * technician — shared by TechniciansService.findOne (no range: whole
 * history) and ReportsService's tenant-wide technician-performance report
 * (optional date range, called once per technician). Extracted here
 * instead of duplicated, same discipline as rollup-payment-status.ts and
 * the outstanding-balance helpers.
 *
 * `db` is `PrismaService.forTenant()`'s return value — callers pass their
 * already-scoped client rather than this function resolving tenant context
 * itself, consistent with every other service method in this codebase.
 */
export async function computeTechnicianPerformance(
  db: ReturnType<PrismaService['forTenant']>,
  technicianId: string,
  range?: TechnicianPerformanceRange,
): Promise<TechnicianPerformance> {
  const jobCardDateFilter =
    range?.from || range?.to
      ? { createdAt: { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) } }
      : {};

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const [jobsOpen, jobsCompleted, hoursAgg, revenueAgg, completedToday, hoursTodayAgg, deliveredJobs] = await Promise.all([
    db.jobCard.count({
      where: { technicianId, deletedAt: null, status: { notIn: TERMINAL_STATUSES }, ...jobCardDateFilter },
    }),
    db.jobCard.count({
      where: { technicianId, deletedAt: null, status: JobCardStatus.DELIVERED, ...jobCardDateFilter },
    }),
    db.jobCardLabour.aggregate({
      where: { jobCard: { technicianId, ...jobCardDateFilter } },
      _sum: { hours: true },
    }),
    db.jobCardLabour.aggregate({
      where: { jobCard: { technicianId, invoice: { status: InvoiceStatus.PAID }, ...jobCardDateFilter } },
      _sum: { lineTotal: true },
    }),
    db.jobCard.count({
      where: { technicianId, deletedAt: null, status: JobCardStatus.DELIVERED, actualDelivery: { gte: todayStart, lt: todayEnd } },
    }),
    db.jobCardLabour.aggregate({
      where: { jobCard: { technicianId, updatedAt: { gte: todayStart, lt: todayEnd } } },
      _sum: { hours: true },
    }),
    db.jobCard.findMany({
      where: { technicianId, deletedAt: null, status: JobCardStatus.DELIVERED, actualDelivery: { not: null } },
      select: { createdAt: true, actualDelivery: true },
    }),
  ]);

  const completionDays = deliveredJobs
    .filter((jc) => jc.actualDelivery !== null)
    .map((jc) => (jc.actualDelivery!.getTime() - jc.createdAt.getTime()) / (24 * 60 * 60 * 1000));
  const avgCompletionDays =
    completionDays.length > 0 ? Math.round((completionDays.reduce((a, b) => a + b, 0) / completionDays.length) * 100) / 100 : null;

  return {
    jobsOpen,
    jobsCompleted,
    totalLabourHours: hoursAgg._sum.hours ?? new Prisma.Decimal(0),
    revenueGenerated: revenueAgg._sum.lineTotal ?? new Prisma.Decimal(0),
    completedToday,
    hoursToday: hoursTodayAgg._sum.hours ?? new Prisma.Decimal(0),
    avgCompletionDays,
  };
}
