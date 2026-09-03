import type { PartStockStatus } from '@/lib/api-types';

/**
 * Mirrors the backend's derivePartStockStatus (apps/api's low-stock.ts)
 * exactly — kept in sync by hand since the two apps don't share a types
 * package yet. Out of stock is its own bucket, not a subset of low stock.
 *
 * currentStock/minStock arrive from the API as strings (Decimal fields,
 * same convention as every money field) — never compare them with native
 * `<=` directly: two strings compare lexicographically ("9.5" <= "10.25"
 * is false), not numerically. Number() first, same as this app's other
 * Decimal-string display math.
 */
export function derivePartStockStatus(part: { currentStock: number | string; minStock: number | string }): PartStockStatus {
  const currentStock = Number(part.currentStock);
  const minStock = Number(part.minStock);
  if (currentStock <= 0) return 'out_of_stock';
  if (currentStock <= minStock) return 'low_stock';
  return 'in_stock';
}
