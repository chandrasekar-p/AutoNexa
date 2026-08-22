import { Injectable } from '@nestjs/common';
import { Prisma, PurchaseInvoiceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../prisma/tenant-context';
import { computeInvoiceOutstanding, sumOutstanding } from '../../common/billing/outstanding';
import { computeTechnicianPerformance } from '../technicians/technician-performance';
import { bucketSales } from './sales-bucketing';
import { calculatePartMargin, calculateTotalMargin } from './profit-margin';
import { calculateLoyaltyLiability } from '../loyalty/loyalty-liability';
import { computeWarrantyStatus } from '../warranty/warranty-status';
import { aggregateComebackRate, ComebackClaimInput } from './comeback-rate';
import { summarizeInvoiceGst } from './gst-summary';
import { ComebackRateQueryDto } from './dto/comeback-rate-query.dto';
import { SalesReportQueryDto } from './dto/sales-report-query.dto';
import { InvoicesReportQueryDto } from './dto/invoices-report-query.dto';
import { PaymentsReportQueryDto } from './dto/payments-report-query.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { PaginatedDateRangeQueryDto } from './dto/paginated-date-range-query.dto';
import { PurchasesReportQueryDto } from './dto/purchases-report-query.dto';
import { LabourRevenueReportQueryDto } from './dto/labour-revenue-report-query.dto';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { computeColumnTotals } from './column-totals';

/**
 * `{ [field]: { gte, lte } }`, or `{}` when neither bound is given — reused
 * across every report below. Exported so ExportService's GST/Tally export
 * filters invoices with the EXACT same date-range logic gstSummary() uses —
 * the export and the report must never disagree on which invoices are "in
 * the period", and sharing this function is what guarantees that.
 */
export function dateRangeWhere(field: string, from?: string, to?: string): Record<string, unknown> {
  if (!from && !to) return {};
  return {
    [field]: {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    },
  };
}

function paginate<T>(rows: T[], page: number, pageSize: number) {
  const total = rows.length;
  const items = rows.slice((page - 1) * pageSize, page * pageSize);
  // Computed over the full `rows`, not just `items` — a page-1-only sum
  // would silently under-count whenever a report has more rows than fit
  // on one page (see column-totals.ts). Cast is safe: computeColumnTotals
  // only reads properties via Object.keys/indexing, never relies on T's
  // actual shape.
  const columnTotals = computeColumnTotals(rows as unknown as Record<string, unknown>[]);
  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize), columnTotals };
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async sales(query: SalesReportQueryDto) {
    const db = this.prisma.forTenant();
    const groupBy = query.groupBy ?? 'day';

    const invoices = await db.invoice.findMany({
      where: dateRangeWhere('createdAt', query.from, query.to),
      select: { createdAt: true, grandTotal: true },
    });

    const buckets = bucketSales(
      invoices.map((i) => ({ date: i.createdAt, amount: i.grandTotal })),
      groupBy,
    );

    return paginate(buckets, query.page ?? 1, query.pageSize ?? 20);
  }

  async invoices(query: InvoicesReportQueryDto) {
    const db = this.prisma.forTenant();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where = {
      ...dateRangeWhere('createdAt', query.from, query.to),
      ...(query.status ? { status: query.status } : {}),
    };

    const [rows, total, summaryAgg] = await Promise.all([
      db.invoice.findMany({
        where,
        // Flat select, not the raw model — a bare `include` still returns
        // every raw column alongside it (leaking `tenantId` into the
        // report table), same issue as the payments report above.
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          subtotal: true,
          cgstAmount: true,
          sgstAmount: true,
          igstAmount: true,
          grandTotal: true,
          createdAt: true,
          customer: { select: { name: true, mobile: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.invoice.count({ where }),
      db.invoice.aggregate({ where, _sum: { grandTotal: true } }),
    ]);

    const items = rows.map(({ customer, ...row }) => ({
      ...row,
      customerName: customer.name,
      customerMobile: customer.mobile,
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      summary: { count: total, totalGrandTotal: summaryAgg._sum.grandTotal ?? new Prisma.Decimal(0) },
    };
  }

  async payments(query: PaymentsReportQueryDto) {
    const db = this.prisma.forTenant();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where = {
      ...dateRangeWhere('paymentDate', query.from, query.to),
      ...(query.method ? { method: query.method } : {}),
    };

    const [rows, total, summaryAgg] = await Promise.all([
      db.payment.findMany({
        where,
        // Flat, display-ready select — not the raw model (which would also
        // leak `tenantId`) and not a nested `invoice` object (which has no
        // `.name` field for the report table's generic cell formatter to
        // pick up, so it fell back to raw JSON). customerName is a bonus:
        // useful on a payments report and previously missing entirely.
        select: {
          id: true,
          amount: true,
          paymentDate: true,
          method: true,
          referenceNumber: true,
          createdAt: true,
          invoice: { select: { invoiceNumber: true, customer: { select: { name: true } } } },
        },
        orderBy: { paymentDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.payment.count({ where }),
      db.payment.aggregate({ where, _sum: { amount: true } }),
    ]);

    const items = rows.map(({ invoice, ...row }) => ({
      ...row,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customer.name,
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      summary: { count: total, totalAmount: summaryAgg._sum.amount ?? new Prisma.Decimal(0) },
      // Aggregated in the DB over every matching payment, not just this
      // page — same reasoning as paginate()'s columnTotals, just computed
      // via a separate query here since `rows` above is already
      // DB-paginated (skip/take), not the full matching set.
      columnTotals: { amount: (summaryAgg._sum.amount ?? new Prisma.Decimal(0)).toNumber() },
    };
  }

  /**
   * Reuses computeInvoiceOutstanding/sumOutstanding from
   * common/billing/outstanding.ts — the exact calculation
   * customers.service.ts uses for one customer's profile, applied
   * tenant-wide and grouped by customer here. Only customers with a
   * positive balance are included.
   */
  async outstanding(query: PaginationQueryDto) {
    const db = this.prisma.forTenant();

    const customers = await db.customer.findMany({
      where: { deletedAt: null },
      include: { invoices: { include: { payments: true } } },
    });

    const rows = customers
      .map((c) => {
        const invoicesWithOutstanding = c.invoices.map((inv) => ({
          ...inv,
          outstanding: computeInvoiceOutstanding(inv),
        }));
        return {
          customerId: c.id,
          customerName: c.name,
          mobile: c.mobile,
          totalOutstanding: sumOutstanding(invoicesWithOutstanding),
        };
      })
      .filter((r) => r.totalOutstanding.gt(0))
      .sort((a, b) => b.totalOutstanding.toNumber() - a.totalOutstanding.toNumber());

    return paginate(rows, query.page ?? 1, query.pageSize ?? 20);
  }

  /** JobCardPart.lineTotal summed per part, within invoiced job cards in range. */
  async partsSales(query: PaginatedDateRangeQueryDto) {
    const db = this.prisma.forTenant();

    const grouped = await db.jobCardPart.groupBy({
      by: ['partId'],
      where: { jobCard: { invoice: dateRangeWhere('createdAt', query.from, query.to) } },
      _sum: { lineTotal: true, quantity: true },
    });

    const partIds = grouped.map((g) => g.partId);
    const parts = partIds.length
      ? await db.part.findMany({ where: { id: { in: partIds } }, select: { id: true, partNumber: true, name: true } })
      : [];
    const partsById = new Map(parts.map((p) => [p.id, p]));

    const rows = grouped
      .map((g) => ({
        partId: g.partId,
        partNumber: partsById.get(g.partId)?.partNumber,
        partName: partsById.get(g.partId)?.name,
        quantitySold: g._sum.quantity ?? 0,
        totalSales: (g._sum.lineTotal ?? new Prisma.Decimal(0)).toDecimalPlaces(2),
      }))
      .sort((a, b) => b.totalSales.toNumber() - a.totalSales.toNumber());

    return paginate(rows, query.page ?? 1, query.pageSize ?? 20);
  }

  /** Point-in-time snapshot — no date range: currentStock x purchasePrice per part. */
  async inventoryValuation(query: PaginationQueryDto) {
    const db = this.prisma.forTenant();

    const parts = await db.part.findMany({ where: { deletedAt: null } });
    const rows = parts.map((p) => ({
      partId: p.id,
      partNumber: p.partNumber,
      name: p.name,
      currentStock: p.currentStock,
      purchasePrice: p.purchasePrice,
      valuation: new Prisma.Decimal(p.currentStock).mul(p.purchasePrice).toDecimalPlaces(2),
    }));

    const grandTotal = rows.reduce((sum, r) => sum.add(r.valuation), new Prisma.Decimal(0)).toDecimalPlaces(2);
    return { ...paginate(rows, query.page ?? 1, query.pageSize ?? 20), grandTotal };
  }

  async purchases(query: PurchasesReportQueryDto) {
    const db = this.prisma.forTenant();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where = {
      ...dateRangeWhere('createdAt', query.from, query.to),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
    };

    const [purchaseOrders, total] = await Promise.all([
      db.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          items: true,
          purchaseInvoices: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.purchaseOrder.count({ where }),
    ]);

    const items = purchaseOrders.map((po) => ({
      id: po.id,
      poNumber: po.poNumber,
      supplier: po.supplier,
      status: po.status,
      createdAt: po.createdAt,
      orderValue: po.items.reduce((sum, i) => sum.add(i.lineTotal), new Prisma.Decimal(0)).toDecimalPlaces(2),
      invoicedValue: po.purchaseInvoices
        .reduce((sum, i) => sum.add(i.total), new Prisma.Decimal(0))
        .toDecimalPlaces(2),
    }));

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /** Sum of unpaid/partially-paid PurchaseInvoice amounts per supplier. */
  async supplierOutstanding(query: PaginationQueryDto) {
    const db = this.prisma.forTenant();

    const unpaidInvoices = await db.purchaseInvoice.findMany({
      where: { status: { in: [PurchaseInvoiceStatus.UNPAID, PurchaseInvoiceStatus.PARTIALLY_PAID] } },
      include: {
        purchaseOrder: { include: { supplier: { select: { id: true, name: true } } } },
        payments: true,
      },
    });

    const bySupplier = new Map<string, { supplierId: string; supplierName: string; outstanding: Prisma.Decimal }>();
    for (const inv of unpaidInvoices) {
      const paid = inv.payments.reduce((sum, p) => sum.add(p.amount), new Prisma.Decimal(0));
      const outstanding = new Prisma.Decimal(inv.total).sub(paid);
      const supplier = inv.purchaseOrder.supplier;
      const existing = bySupplier.get(supplier.id);
      if (existing) {
        existing.outstanding = existing.outstanding.add(outstanding);
      } else {
        bySupplier.set(supplier.id, { supplierId: supplier.id, supplierName: supplier.name, outstanding });
      }
    }

    const rows = [...bySupplier.values()]
      .map((r) => ({ ...r, outstanding: r.outstanding.toDecimalPlaces(2) }))
      .sort((a, b) => b.outstanding.toNumber() - a.outstanding.toNumber());

    return paginate(rows, query.page ?? 1, query.pageSize ?? 20);
  }

  /** JobCardLabour.lineTotal within invoiced job cards in range, optionally grouped by technician. */
  async labourRevenue(query: LabourRevenueReportQueryDto) {
    const db = this.prisma.forTenant();
    const where = { jobCard: { invoice: dateRangeWhere('createdAt', query.from, query.to) } };

    if (!query.groupByTechnician) {
      const agg = await db.jobCardLabour.aggregate({ where, _sum: { lineTotal: true, hours: true } });
      return {
        totalRevenue: (agg._sum.lineTotal ?? new Prisma.Decimal(0)).toDecimalPlaces(2),
        totalHours: agg._sum.hours ?? new Prisma.Decimal(0),
      };
    }

    const labourLines = await db.jobCardLabour.findMany({
      where,
      select: { lineTotal: true, hours: true, jobCard: { select: { technicianId: true } } },
    });

    const byTechnician = new Map<
      string,
      { technicianId: string | null; revenue: Prisma.Decimal; hours: Prisma.Decimal }
    >();
    for (const line of labourLines) {
      const key = line.jobCard.technicianId ?? 'unassigned';
      const existing =
        byTechnician.get(key) ??
        ({ technicianId: line.jobCard.technicianId, revenue: new Prisma.Decimal(0), hours: new Prisma.Decimal(0) } as const);
      byTechnician.set(key, {
        technicianId: existing.technicianId,
        revenue: existing.revenue.add(line.lineTotal),
        hours: existing.hours.add(line.hours),
      });
    }

    const technicianIds = [...byTechnician.values()]
      .map((v) => v.technicianId)
      .filter((id): id is string => !!id);
    const technicians = technicianIds.length
      ? await db.technician.findMany({
          where: { id: { in: technicianIds } },
          include: { user: { select: { name: true } } },
        })
      : [];
    const techById = new Map(technicians.map((t) => [t.id, t]));

    const rows = [...byTechnician.values()]
      .map((v) => ({
        technicianId: v.technicianId,
        technicianName: v.technicianId ? (techById.get(v.technicianId)?.user.name ?? 'Unknown') : 'Unassigned',
        revenue: v.revenue.toDecimalPlaces(2),
        hours: v.hours.toDecimalPlaces(2),
      }))
      .sort((a, b) => b.revenue.toNumber() - a.revenue.toNumber());

    return paginate(rows, query.page ?? 1, query.pageSize ?? 20);
  }

  /** Tenant-wide version of technicians.service.ts's per-technician workload/revenue computation. */
  async technicianPerformance(query: PaginatedDateRangeQueryDto) {
    const db = this.prisma.forTenant();
    const range = {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    };

    const technicians = await db.technician.findMany({ include: { user: { select: { id: true, name: true } } } });

    const rows = await Promise.all(
      technicians.map(async (t) => {
        const performance = await computeTechnicianPerformance(db, t.id, range);
        return { technicianId: t.id, name: t.user.name, employeeId: t.employeeId, ...performance };
      }),
    );

    rows.sort((a, b) => b.revenueGenerated.toNumber() - a.revenueGenerated.toNumber());

    return paginate(rows, query.page ?? 1, query.pageSize ?? 20);
  }

  async customerRevenue(query: PaginatedDateRangeQueryDto) {
    const db = this.prisma.forTenant();

    const grouped = await db.invoice.groupBy({
      by: ['customerId'],
      where: dateRangeWhere('createdAt', query.from, query.to),
      _sum: { grandTotal: true },
    });

    const customerIds = grouped.map((g) => g.customerId);
    const customers = customerIds.length
      ? await db.customer.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, name: true, mobile: true },
        })
      : [];
    const custById = new Map(customers.map((c) => [c.id, c]));

    const rows = grouped
      .map((g) => ({
        customerId: g.customerId,
        customer: custById.get(g.customerId),
        totalRevenue: (g._sum.grandTotal ?? new Prisma.Decimal(0)).toDecimalPlaces(2),
      }))
      .sort((a, b) => b.totalRevenue.toNumber() - a.totalRevenue.toNumber());

    return paginate(rows, query.page ?? 1, query.pageSize ?? 20);
  }

  /**
   * NOT a true profit figure — see profit-margin.ts. Parts margin uses
   * each Part's CURRENT purchasePrice (JobCardPart never snapshotted a
   * cost basis, only the selling price it charged), and labour is counted
   * at 100% margin since there's no per-technician cost/pay-rate data in
   * this system to net against labour revenue.
   */
  async profitMargin(query: DateRangeQueryDto) {
    const db = this.prisma.forTenant();
    const invoiceDateFilter = dateRangeWhere('createdAt', query.from, query.to);

    const [partLines, labourAgg] = await Promise.all([
      db.jobCardPart.findMany({
        where: { jobCard: { invoice: invoiceDateFilter } },
        include: { part: { select: { purchasePrice: true } } },
      }),
      db.jobCardLabour.aggregate({
        where: { jobCard: { invoice: invoiceDateFilter } },
        _sum: { lineTotal: true },
      }),
    ]);

    const partsMargin = partLines
      .reduce(
        (sum, line) =>
          sum.add(
            calculatePartMargin({
              quantity: line.quantity,
              sellingPrice: line.unitPrice,
              purchasePrice: line.part.purchasePrice,
            }),
          ),
        new Prisma.Decimal(0),
      )
      .toDecimalPlaces(2);

    const labourRevenue = (labourAgg._sum.lineTotal ?? new Prisma.Decimal(0)).toDecimalPlaces(2);

    return {
      partsMargin,
      labourRevenue,
      totalMargin: calculateTotalMargin(partsMargin, labourRevenue),
      note:
        'Approximate, not a true profit figure: labour is counted at 100% margin (no per-technician cost data exists to net against it), and parts margin uses each part\'s current purchase price rather than a historical cost snapshot. Excludes rent, salaries, and other overhead.',
    };
  }

  /**
   * Standard GST-filing-prep summary: CGST/SGST/IGST totals across invoices
   * in range. Fetches rows (rather than a Prisma-side aggregate) and
   * reduces them via summarizeInvoiceGst() specifically so ExportService's
   * GST/Tally export — which needs the same rows anyway for its line-level
   * breakdown — can share this exact function and never disagree with this
   * report on the same period.
   */
  async gstSummary(query: DateRangeQueryDto) {
    const db = this.prisma.forTenant();
    const invoices = await db.invoice.findMany({
      where: dateRangeWhere('createdAt', query.from, query.to),
      select: { subtotal: true, cgstAmount: true, sgstAmount: true, igstAmount: true, grandTotal: true },
    });

    return summarizeInvoiceGst(invoices);
  }

  async jobCardStatus(query: DateRangeQueryDto) {
    const db = this.prisma.forTenant();
    const grouped = await db.jobCard.groupBy({
      by: ['status'],
      where: { deletedAt: null, ...dateRangeWhere('createdAt', query.from, query.to) },
      _count: { _all: true },
    });

    return grouped
      .map((g) => ({ status: g.status, count: g._count._all }))
      .sort((a, b) => b.count - a.count);
  }

  /** Counts by status plus a paginated list — same "summary + list" shape as outstanding() above. "Expiring soon" reuses whichever threshold the tenant's already configured for package-expiry reminders, so this report and the reminder cron agree on what "soon" means. */
  async packagesSummary(query: PaginationQueryDto) {
    const db = this.prisma.forTenant();
    const tenantId = TenantContext.requireTenantId();
    const [settings, packages] = await Promise.all([
      db.tenantSettings.findUniqueOrThrow({ where: { tenantId } }),
      db.customerServicePackage.findMany({
        include: {
          servicePackage: { select: { name: true } },
          customer: { select: { id: true, name: true } },
          vehicle: { select: { id: true, registrationNo: true } },
        },
        orderBy: { endDate: 'asc' },
      }),
    ]);

    const soonestThresholdDays = Math.max(...settings.reminderThresholdDays);
    const expiringHorizon = new Date(Date.now() + soonestThresholdDays * 24 * 60 * 60 * 1000);
    const now = new Date();

    const counts = {
      active: packages.filter((p) => p.status === 'ACTIVE' && p.endDate > expiringHorizon).length,
      expiringSoon: packages.filter((p) => p.status === 'ACTIVE' && p.endDate <= expiringHorizon && p.endDate > now).length,
      expired: packages.filter((p) => p.status === 'EXPIRED').length,
      cancelled: packages.filter((p) => p.status === 'CANCELLED').length,
    };

    const rows = packages.map((p) => ({
      id: p.id,
      packageName: p.servicePackage.name,
      customerName: p.customer.name,
      vehicleRegistrationNo: p.vehicle.registrationNo,
      status: p.status,
      startDate: p.startDate,
      endDate: p.endDate,
      visitsUsed: p.visitsUsed,
      visitLimit: p.visitLimit,
    }));

    return { counts, ...paginate(rows, query.page ?? 1, query.pageSize ?? 20) };
  }

  /** Total outstanding loyalty points across every customer, converted to rupees at the tenant's current redemption rate — see loyalty-liability.ts's doc comment on what this number does and doesn't represent. */
  async loyaltyLiability() {
    const db = this.prisma.forTenant();
    const tenantId = TenantContext.requireTenantId();
    const [settings, customers] = await Promise.all([
      db.tenantSettings.findUniqueOrThrow({ where: { tenantId } }),
      db.customer.findMany({ where: { deletedAt: null, loyaltyPointsBalance: { gt: 0 } }, select: { loyaltyPointsBalance: true } }),
    ]);

    const pointValueRupees = settings.loyaltyPointValueRupees;
    const totalPointsOutstanding = customers.reduce((sum, c) => sum + c.loyaltyPointsBalance, 0);

    return {
      totalPointsOutstanding,
      customersWithBalance: customers.length,
      liabilityRupees: calculateLoyaltyLiability(customers.map((c) => c.loyaltyPointsBalance), pointValueRupees),
    };
  }

  /**
   * Every currently-active-warranty labour/part line, tenant-wide — cost
   * exposure if every one of them came back as a valid free claim
   * tomorrow. Parts use purchasePrice (the workshop's replacement cost,
   * not lost retail revenue); labour uses its full snapshotted lineTotal,
   * with the same "no per-technician cost data" caveat profit-margin.ts
   * already documents for labour margin.
   */
  async warrantyLiability() {
    const db = this.prisma.forTenant();

    const [labourLines, partLines] = await Promise.all([
      db.jobCardLabour.findMany({
        where: { warrantyMonths: { not: null }, jobCard: { deletedAt: null, actualDelivery: { not: null } } },
        select: { warrantyMonths: true, lineTotal: true, jobCard: { select: { actualDelivery: true } } },
      }),
      db.jobCardPart.findMany({
        where: {
          OR: [{ warrantyMonths: { not: null } }, { warrantyKm: { not: null } }],
          jobCard: { deletedAt: null, actualDelivery: { not: null } },
        },
        select: {
          warrantyMonths: true,
          warrantyKm: true,
          quantity: true,
          part: { select: { purchasePrice: true } },
          jobCard: { select: { actualDelivery: true, odometer: true, vehicle: { select: { odometerReading: true } } } },
        },
      }),
    ]);

    const activeLabour = labourLines.filter((l) => computeWarrantyStatus(l.jobCard.actualDelivery, l.warrantyMonths, null, null, null).isActive);
    const activeParts = partLines.filter(
      (p) => computeWarrantyStatus(p.jobCard.actualDelivery, p.warrantyMonths, p.warrantyKm, p.jobCard.odometer, p.jobCard.vehicle.odometerReading).isActive,
    );

    const labourExposure = activeLabour.reduce((sum, l) => sum.add(l.lineTotal), new Prisma.Decimal(0));
    const partsExposure = activeParts.reduce((sum, p) => sum.add(new Prisma.Decimal(p.part.purchasePrice).mul(p.quantity)), new Prisma.Decimal(0));

    return {
      labourLinesUnderWarranty: activeLabour.length,
      partsLinesUnderWarranty: activeParts.length,
      labourExposure: labourExposure.toDecimalPlaces(2),
      partsExposure: partsExposure.toDecimalPlaces(2),
      totalExposure: labourExposure.add(partsExposure).toDecimalPlaces(2),
    };
  }

  /** Counts by status + a paginated list, same "summary + list" shape as packagesSummary. */
  async warrantyClaimsSummary(query: PaginationQueryDto) {
    const db = this.prisma.forTenant();
    const claims = await db.warrantyClaim.findMany({
      include: {
        claimJobCard: { select: { jobCardNumber: true } },
        originalJobCardPart: { select: { part: { select: { name: true } } } },
        originalJobCardLabour: { select: { description: true, labourItem: { select: { description: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const counts = {
      open: claims.filter((c) => c.status === 'OPEN').length,
      approved: claims.filter((c) => c.status === 'APPROVED').length,
      rejected: claims.filter((c) => c.status === 'REJECTED').length,
      resolved: claims.filter((c) => c.status === 'RESOLVED').length,
    };

    const rows = claims.map((c) => ({
      id: c.id,
      claimJobCardNumber: c.claimJobCard.jobCardNumber,
      originalItem: c.originalJobCardPart?.part.name ?? c.originalJobCardLabour?.labourItem?.description ?? c.originalJobCardLabour?.description ?? 'Unknown',
      status: c.status,
      isBillable: c.isBillable,
      createdAt: c.createdAt,
    }));

    return { counts, ...paginate(rows, query.page ?? 1, query.pageSize ?? 20) };
  }

  /**
   * One endpoint with a groupBy, mirroring the sales report's own
   * groupBy day|month convention rather than three near-duplicate
   * endpoints. `supplier` groups by Part.supplierId — the part's
   * configured PREFERRED supplier, not a record of which specific
   * purchase batch a given unit came from (this system has no lot/batch
   * tracking); a documented approximation, same spirit as
   * profit-margin.ts's own "approximation, not exact" caveats. Returns
   * raw counts, not a computed percentage rate — same "counts, not a
   * derived ratio" choice jobCardStatus() already makes above.
   */
  async comebackRate(query: ComebackRateQueryDto) {
    const db = this.prisma.forTenant();
    const claims = await db.warrantyClaim.findMany({
      where: dateRangeWhere('createdAt', query.from, query.to),
      include: {
        originalJobCardPart: {
          select: {
            partId: true,
            part: { select: { name: true, supplierId: true, supplier: { select: { name: true } } } },
            jobCard: { select: { technicianId: true, technician: { select: { user: { select: { name: true } } } } } },
          },
        },
        originalJobCardLabour: {
          select: { jobCard: { select: { technicianId: true, technician: { select: { user: { select: { name: true } } } } } } },
        },
      },
    });

    const inputs: ComebackClaimInput[] = claims.map((claim) => {
      const jobCard = claim.originalJobCardPart?.jobCard ?? claim.originalJobCardLabour?.jobCard;
      return {
        technicianId: jobCard?.technicianId ?? null,
        technicianName: jobCard?.technician?.user.name ?? null,
        partId: claim.originalJobCardPart?.partId ?? null,
        partName: claim.originalJobCardPart?.part.name ?? null,
        supplierId: claim.originalJobCardPart?.part.supplierId ?? null,
        supplierName: claim.originalJobCardPart?.part.supplier?.name ?? null,
      };
    });

    return aggregateComebackRate(inputs, query.groupBy);
  }
}
