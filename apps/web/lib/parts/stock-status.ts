import type { PartStockStatus } from '@/lib/api-types';

/** Mirrors the backend's derivePartStockStatus (apps/api's low-stock.ts) exactly — kept in sync by hand since the two apps don't share a types package yet. Out of stock is its own bucket, not a subset of low stock. */
export function derivePartStockStatus(part: { currentStock: number; minStock: number }): PartStockStatus {
  if (part.currentStock <= 0) return 'out_of_stock';
  if (part.currentStock <= part.minStock) return 'low_stock';
  return 'in_stock';
}
