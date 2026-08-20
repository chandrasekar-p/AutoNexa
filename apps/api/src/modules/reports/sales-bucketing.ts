import { Prisma } from '@prisma/client';

type Decimalish = Prisma.Decimal | number | string;

export type SalesGroupBy = 'day' | 'month';

export interface SalesBucketInput {
  date: Date;
  amount: Decimalish;
}

export interface SalesBucket {
  period: string;
  total: Prisma.Decimal;
}

/**
 * Buckets invoice amounts by day ("YYYY-MM-DD") or month ("YYYY-MM"),
 * summing within each bucket, sorted chronologically. Pure and DB-free so
 * GET /reports/sales's grouping is unit-testable without a DB — mirrors
 * gst-split.ts's approach.
 */
export function bucketSales(entries: SalesBucketInput[], groupBy: SalesGroupBy): SalesBucket[] {
  const buckets = new Map<string, Prisma.Decimal>();

  for (const entry of entries) {
    const iso = entry.date.toISOString();
    const period = groupBy === 'day' ? iso.slice(0, 10) : iso.slice(0, 7);
    const running = buckets.get(period) ?? new Prisma.Decimal(0);
    buckets.set(period, running.add(entry.amount));
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, total]) => ({ period, total: total.toDecimalPlaces(2) }));
}
