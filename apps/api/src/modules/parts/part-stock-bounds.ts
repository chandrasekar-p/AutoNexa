/**
 * Backs the "minimum stock cannot be greater than maximum stock" check on
 * both create and update — the frontend's zod schema already checks this,
 * but that's UX only; a direct API call bypassed it entirely until now
 * (maxStock is optional, so no ceiling at all is always valid).
 */
export function isValidStockBounds(minStock: number, maxStock: number | null | undefined): boolean {
  if (maxStock === null || maxStock === undefined) return true;
  return minStock <= maxStock;
}
