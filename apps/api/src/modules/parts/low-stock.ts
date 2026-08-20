/**
 * The actual "low stock" comparison — shared by PartsService.findAll's
 * `lowStock=true` filter (Phase 6), the dashboard's lowStockCount, and the
 * notifications alerts endpoint's low-stock list, instead of each
 * reimplementing `currentStock <= minStock`.
 */
export function isLowStock(part: { currentStock: number; minStock: number }): boolean {
  return part.currentStock <= part.minStock;
}
