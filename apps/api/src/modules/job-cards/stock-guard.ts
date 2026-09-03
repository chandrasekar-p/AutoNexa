import { Prisma } from '@prisma/client';

type DecimalInput = number | string | Prisma.Decimal;

/**
 * Pure predicate backing the "Insufficient stock" rejection on
 * POST /job-cards/:id/parts. This is a fast-fail early check only — the
 * real safety net against concurrent over-consumption is the guarded
 * UPDATE (`WHERE currentStock >= quantity`) in job-cards.service.ts, since
 * a plain read-then-check-then-decrement has a race window under
 * concurrency (the exact risk the Phase 1 architecture doc's risk table
 * calls out for inventory). This function documents/tests the arithmetic
 * both places agree on.
 *
 * Decimal-safe (currentStock/requestedQuantity are fractional — engine
 * oil, coolant, etc.) — never native `<=` on the raw values, which would
 * do string/NaN comparison on a Prisma.Decimal, not numeric comparison.
 */
export function hasSufficientStock(currentStock: DecimalInput, requestedQuantity: DecimalInput): boolean {
  return new Prisma.Decimal(requestedQuantity).lte(new Prisma.Decimal(currentStock));
}
