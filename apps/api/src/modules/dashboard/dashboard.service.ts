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
   */
  async summary() {
    const db = this.prisma.forTenant();
    const today = todayRange();
    const month = monthRange();

    const [
      todaysAppointments,
      vehiclesInService,
      openJobCards,
      completedJobsToday,
      pendingEstimates,
      unpaidInvoices,
      todaysSalesAgg,
      monthlySalesAgg,
      labourRevenueAgg,
      partsRevenueAgg,
      parts,
      technicians,
    ] = await Promise.all([
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
      db.part.findMany({ where: { deletedAt: null, isActive: true } }),
      db.technician.findMany({ include: { user: { select: { name: true } } } }),
    ]);

    const invoicesWithOutstanding = unpaidInvoices.map((inv) => ({
      ...inv,
      outstanding: computeInvoiceOutstanding(inv),
    }));
    const pendingPayments = {
      count: invoicesWithOutstanding.length,
      totalOutstanding: sumOutstanding(invoicesWithOutstanding),
    };

    // Reuses the same per-technician computation as
    // TechniciansService.findOne and the technician-performance report —
    // only jobsOpen is surfaced here, but the shared function is called as
    // a whole rather than reimplementing just that one count.
    const technicianWorkload = await Promise.all(
      technicians.map(async (t) => {
        const performance = await computeTechnicianPerformance(db, t.id);
        return { technicianId: t.id, name: t.user.name, jobsOpen: performance.jobsOpen };
      }),
    );

    return {
      todaysAppointments,
      vehiclesInService,
      openJobCards,
      completedJobsToday,
      pendingEstimates,
      pendingPayments,
      todaysSales: todaysSalesAgg._sum.grandTotal ?? new Prisma.Decimal(0),
      monthlySales: monthlySalesAgg._sum.grandTotal ?? new Prisma.Decimal(0),
      labourRevenueMonthly: labourRevenueAgg._sum.lineTotal ?? new Prisma.Decimal(0),
      partsRevenueMonthly: partsRevenueAgg._sum.lineTotal ?? new Prisma.Decimal(0),
      lowStockCount: parts.filter(isLowStock).length,
      technicianWorkload,
    };
  }
}
