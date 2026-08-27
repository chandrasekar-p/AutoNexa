/**
 * The actual "low stock" comparison — shared by PartsService.findAll's
 * `lowStock=true` filter (Phase 6), the dashboard's lowStockCount, and the
 * notifications alerts endpoint's low-stock list, instead of each
 * reimplementing `currentStock <= minStock`.
 */
export function isLowStock(part: { currentStock: number; minStock: number }): boolean {
  return part.currentStock <= part.minStock;
}

export type PartStockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

/**
 * The non-overlapping 3-way split the Parts page's KPI cards/stockStatus
 * filter need — distinct from isLowStock above, which deliberately
 * includes zero stock (its other callers, the dashboard's lowStockCount
 * and the notifications low-stock alert, want "at or below reorder point"
 * as one bucket). Here, zero stock is its own OUT_OF_STOCK bucket instead.
 */
export function derivePartStockStatus(part: { currentStock: number; minStock: number }): PartStockStatus {
  if (part.currentStock <= 0) return 'out_of_stock';
  if (isLowStock(part)) return 'low_stock';
  return 'in_stock';
}
