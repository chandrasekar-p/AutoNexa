import { CustomerPackageStatus } from '@prisma/client';

/**
 * Pure predicates backing package-redemption rejections. Same role as
 * job-cards/stock-guard.ts's hasSufficientStock — a fast-fail check that
 * documents/tests the arithmetic; the actual concurrency safety net is
 * the guarded UPDATE in customer-service-packages.service.ts
 * (`WHERE status = 'ACTIVE' AND visitsUsed < visitLimit`), not this
 * function itself. See the architecture doc's testing section for why
 * this codebase doesn't build a concurrent-load test harness — the same
 * honest limitation stock-guard.ts already documents.
 */
export function hasVisitsRemaining(visitsUsed: number, visitLimit: number | null): boolean {
  return visitLimit === null || visitsUsed < visitLimit;
}

export function isPackageValidNow(status: CustomerPackageStatus, endDate: Date, now: Date = new Date()): boolean {
  return status === CustomerPackageStatus.ACTIVE && endDate.getTime() >= now.getTime();
}

/** Combines both checks — what job-cards.service.ts actually needs to know before linking a job card to a package. */
export function isPackageRedeemable(
  status: CustomerPackageStatus,
  endDate: Date,
  visitsUsed: number,
  visitLimit: number | null,
  now: Date = new Date(),
): boolean {
  return isPackageValidNow(status, endDate, now) && hasVisitsRemaining(visitsUsed, visitLimit);
}
