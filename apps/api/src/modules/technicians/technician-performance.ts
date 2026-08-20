import { InvoiceStatus, JobCardStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const TERMINAL_STATUSES = [JobCardStatus.DELIVERED, JobCardStatus.CANCELLED];

export interface TechnicianPerformance {
  jobsOpen: number;
  jobsCompleted: number;
  totalLabourHours: Prisma.Decimal;
  revenueGenerated: Prisma.Decimal;
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

  const [jobsOpen, jobsCompleted, hoursAgg, revenueAgg] = await Promise.all([
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
  ]);

  return {
    jobsOpen,
    jobsCompleted,
    totalLabourHours: hoursAgg._sum.hours ?? new Prisma.Decimal(0),
    revenueGenerated: revenueAgg._sum.lineTotal ?? new Prisma.Decimal(0),
  };
}
