import { Prisma } from '@prisma/client';

type DecimalInput = number | string | Prisma.Decimal;

/**
 * Backs the "minimum stock cannot be greater than maximum stock" check on
 * both create and update — the frontend's zod schema already checks this,
 * but that's UX only; a direct API call bypassed it entirely until now
 * (maxStock is optional, so no ceiling at all is always valid).
 *
 * Decimal-safe (minStock/maxStock are Decimal(10,3)) — never native `<=`
 * on the raw values.
 */
export function isValidStockBounds(minStock: DecimalInput, maxStock: DecimalInput | null | undefined): boolean {
  if (maxStock === null || maxStock === undefined) return true;
  return new Prisma.Decimal(minStock).lte(new Prisma.Decimal(maxStock));
}
