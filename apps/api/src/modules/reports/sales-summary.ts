import { Prisma } from '@prisma/client';
import { SalesGroupBy } from './sales-bucketing';

type Decimalish = Prisma.Decimal | number | string;

export interface SalesSummaryEntry {
  date: Date;
  amount: Decimalish;
  // null for standalone service-package invoices, which have no JobCard.
  vehicleId: string | null;
}

export interface SalesSummaryBucket {
  period: string;
  invoiceCount: number;
  carsServiced: number;
  total: Prisma.Decimal;
  averageInvoice: Prisma.Decimal;
}

export interface SalesSummaryKpis {
  totalSales: Prisma.Decimal;
  totalInvoices: number;
  carsServiced: number;
  averageInvoiceValue: Prisma.Decimal;
}

export interface SalesSummary {
  buckets: SalesSummaryBucket[];
  kpis: SalesSummaryKpis & { highestDay: { period: string; total: Prisma.Decimal } | null };
  // Always a full (possibly all-zero) object, never null — the "don't
  // divide by zero into a fake %" guard belongs at the point each %
  // change is computed (see report-kpi-cards.tsx's pctChange), the same
  // place SalesTrendChart already does it, not here.
  previousKpis: SalesSummaryKpis;
}

function periodKey(date: Date, groupBy: SalesGroupBy): string {
  const iso = date.toISOString();
  return groupBy === 'day' ? iso.slice(0, 10) : iso.slice(0, 7);
}

function distinctVehicleCount(entries: SalesSummaryEntry[]): number {
  return new Set(entries.map((e) => e.vehicleId).filter((id): id is string => id !== null)).size;
}

function computeKpis(entries: SalesSummaryEntry[]): SalesSummaryKpis {
  const totalSales = entries.reduce((sum, e) => sum.add(e.amount), new Prisma.Decimal(0)).toDecimalPlaces(2);
  const totalInvoices = entries.length;
  return {
    totalSales,
    totalInvoices,
    carsServiced: distinctVehicleCount(entries),
    averageInvoiceValue: totalInvoices > 0 ? totalSales.dividedBy(totalInvoices).toDecimalPlaces(2) : new Prisma.Decimal(0),
  };
}

/**
 * Powers GET /reports/sales-summary — the Reports page's Sales KPI cards,
 * chart, and detail table all read from this one pure function's output,
 * so what's shown on screen can never drift between the three (same
 * "shared source of truth" reasoning as estimate-totals.ts). `previous`
 * entries come from the immediately-preceding equal-length period (see
 * previousPeriodRange) and only feed `previousKpis` — the %-change math
 * itself lives at the display layer, not here.
 *
 * `carsServiced` in `kpis` is a distinct-vehicle count over the WHOLE
 * period — deliberately not a sum of each bucket's distinct count, which
 * would double-count a vehicle serviced twice in the window.
 */
export function computeSalesSummary(current: SalesSummaryEntry[], previous: SalesSummaryEntry[], groupBy: SalesGroupBy): SalesSummary {
  const grouped = new Map<string, SalesSummaryEntry[]>();
  for (const entry of current) {
    const period = periodKey(entry.date, groupBy);
    const list = grouped.get(period) ?? [];
    list.push(entry);
    grouped.set(period, list);
  }

  const buckets: SalesSummaryBucket[] = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, entries]) => {
      const total = entries.reduce((sum, e) => sum.add(e.amount), new Prisma.Decimal(0)).toDecimalPlaces(2);
      const invoiceCount = entries.length;
      return {
        period,
        invoiceCount,
        carsServiced: distinctVehicleCount(entries),
        total,
        averageInvoice: invoiceCount > 0 ? total.dividedBy(invoiceCount).toDecimalPlaces(2) : new Prisma.Decimal(0),
      };
    });

  const highestBucket = buckets.reduce<SalesSummaryBucket | null>(
    (max, row) => (max === null || row.total.greaterThan(max.total) ? row : max),
    null,
  );

  return {
    buckets,
    kpis: {
      ...computeKpis(current),
      highestDay: highestBucket ? { period: highestBucket.period, total: highestBucket.total } : null,
    },
    previousKpis: computeKpis(previous),
  };
}

/**
 * The equal-length period immediately preceding `[from, to]` — e.g. for
 * "19 Aug – 22 Aug" (4 days) that's "15 Aug – 18 Aug". Generalizes
 * SalesTrendChart's `previousRangeFor`, which only handles "last N days
 * ending today" presets — this report accepts an arbitrary user-picked
 * range, so the previous window has to be derived from `from`/`to`
 * directly rather than from a preset day-count.
 */
export function previousPeriodRange(from: Date, to: Date): { from: Date; to: Date } {
  const spanMs = to.getTime() - from.getTime();
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - spanMs);
  return { from: previousFrom, to: previousTo };
}
