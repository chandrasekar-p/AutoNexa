import { Injectable } from '@nestjs/common';
import { EstimateStatus, InvoiceStatus, JobCardStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { computeInvoiceOutstanding, sumOutstanding } from '../../common/billing/outstanding';
import { computeTechnicianPerformance } from '../technicians/technician-performance';
import { isLowStock } from '../parts/low-stock';

const IN_BAY_STATUSES: JobCardStatus[] = [
  JobCardStatus.DIAGNOSIS,
  JobCardStatus.APPROVED,
  JobCardStatus.IN_PROGRESS,
  JobCardStatus.WAITING_PARTS,
  JobCardStatus.QUALITY_CHECK,
];
const TERMINAL_JOB_CARD_STATUSES: JobCardStatus[] = [JobCardStatus.DELIVERED, JobCardStatus.CANCELLED];
const OUTSTANDING_STATUSES: InvoiceStatus[] = [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID];

function todayRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

function monthRange(): { start: Date; end: Date } {
  const now = new Date();
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * "Today"/"this month" boundaries use the server's local time, not
   * TenantSettings.timezone — this codebase has no per-tenant
   * timezone-aware date math anywhere yet (no such dependency exists), so
   * this is a documented simplification consistent with that, not an
   * oversight specific to the dashboard.
   *
   * `canViewFinancials` (report:read) gates the money fields — pending
   * payments, sales, labour/parts revenue — which a Technician or
   * Receptionist shouldn't see even though the dashboard itself is
   * universal. Those fields are simply omitted from the response (and
   * their queries skipped entirely, not just redacted after the fact) when
   * false, rather than nulled — the frontend only renders the KPI cards
   * that are actually present.
   *
   * `currentUserId` scopes the "Technician Workload" card: a user who is
   * themselves a technician (has a Technician row) should only see their
   * own open-job count on their own dashboard, not every technician's —
   * that list is a shop-floor-planning view for Owner/Manager/Receptionist,
   * not something a technician needs about their coworkers.
   */
  async summary(canViewFinancials: boolean, currentUserId: string) {
    const db = this.prisma.forTenant();
    const today = todayRange();
    const month = monthRange();

    const [
      totalCustomers,
      todaysAppointments,
      vehiclesInService,
      openJobCards,
      completedJobsToday,
      pendingEstimates,
      parts,
      technicians,
      currentTechnician,
    ] = await Promise.all([
      db.customer.count({ where: { deletedAt: null } }),
      db.appointment.count({
        where: { deletedAt: null, appointmentDate: { gte: today.start, lt: today.end } },
      }),
      db.jobCard.count({ where: { deletedAt: null, status: { in: IN_BAY_STATUSES } } }),
      db.jobCard.count({ where: { deletedAt: null, status: { notIn: TERMINAL_JOB_CARD_STATUSES } } }),
      db.jobCard.count({
        where: {
          deletedAt: null,
          status: JobCardStatus.DELIVERED,
          actualDelivery: { gte: today.start, lt: today.end },
        },
      }),
      db.estimate.count({ where: { deletedAt: null, status: EstimateStatus.SENT } }),
      db.part.findMany({ where: { deletedAt: null, isActive: true } }),
      db.technician.findMany({ include: { user: { select: { name: true } } } }),
      db.technician.findUnique({ where: { userId: currentUserId }, include: { user: { select: { name: true } } } }),
    ]);

    const techniciansForWorkload = currentTechnician ? [currentTechnician] : technicians;

    // Reuses the same per-technician computation as
    // TechniciansService.findOne and the technician-performance report —
    // only jobsOpen is surfaced here, but the shared function is called as
    // a whole rather than reimplementing just that one count.
    const technicianWorkload = await Promise.all(
      techniciansForWorkload.map(async (t) => {
        const performance = await computeTechnicianPerformance(db, t.id);
        return { technicianId: t.id, name: t.user.name, jobsOpen: performance.jobsOpen };
      }),
    );

    const base = {
      totalCustomers,
      todaysAppointments,
      vehiclesInService,
      openJobCards,
      completedJobsToday,
      pendingEstimates,
      lowStockCount: parts.filter(isLowStock).length,
      technicianWorkload,
      technicianWorkloadScope: currentTechnician ? ('mine' as const) : ('all' as const),
    };

    if (!canViewFinancials) return base;

    const [unpaidInvoices, todaysSalesAgg, monthlySalesAgg, labourRevenueAgg, partsRevenueAgg] = await Promise.all([
      db.invoice.findMany({ where: { status: { in: OUTSTANDING_STATUSES } }, include: { payments: true } }),
      db.invoice.aggregate({
        where: { createdAt: { gte: today.start, lt: today.end } },
        _sum: { grandTotal: true },
      }),
      db.invoice.aggregate({
        where: { createdAt: { gte: month.start, lt: month.end } },
        _sum: { grandTotal: true },
      }),
      db.jobCardLabour.aggregate({
        where: { jobCard: { invoice: { createdAt: { gte: month.start, lt: month.end } } } },
        _sum: { lineTotal: true },
      }),
      db.jobCardPart.aggregate({
        where: { jobCard: { invoice: { createdAt: { gte: month.start, lt: month.end } } } },
        _sum: { lineTotal: true },
      }),
    ]);

    const invoicesWithOutstanding = unpaidInvoices.map((inv) => ({
      ...inv,
      outstanding: computeInvoiceOutstanding(inv),
    }));
    const pendingPayments = {
      count: invoicesWithOutstanding.length,
      totalOutstanding: sumOutstanding(invoicesWithOutstanding),
    };

    return {
      ...base,
      pendingPayments,
      todaysSales: todaysSalesAgg._sum.grandTotal ?? new Prisma.Decimal(0),
      monthlySales: monthlySalesAgg._sum.grandTotal ?? new Prisma.Decimal(0),
      labourRevenueMonthly: labourRevenueAgg._sum.lineTotal ?? new Prisma.Decimal(0),
      partsRevenueMonthly: partsRevenueAgg._sum.lineTotal ?? new Prisma.Decimal(0),
    };
  }
}
