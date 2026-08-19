import { Prisma } from '@prisma/client';

/**
 * `{prefix}-{number padded to padLength digits}`, e.g. formatSequenceNumber('JC', 1) -> "JC-0001".
 * Pure and separate from the DB call below so it's unit-testable on its own.
 */
export function formatSequenceNumber(prefix: string, number: number, padLength = 4): string {
  return `${prefix}-${String(number).padStart(padLength, '0')}`;
}

/**
 * Atomically increments (or creates) the per-tenant `TenantSequence` row for
 * `entityType` and returns the formatted human-readable number. Must run
 * inside the same transaction as the record being numbered — `tx` here
 * should be the `tx` argument from a `PrismaService.forTenant().$transaction(...)`
 * call — so a rolled-back create also rolls back the increment.
 *
 * `TenantSequence` isn't in `TENANT_SCOPED_MODELS` (it's looked up by its
 * own `[tenantId, entityType]` unique key, not a plain tenant-scoped list),
 * so `tenantId` is passed explicitly here rather than relying on
 * `forTenant()`'s auto-injection.
 *
 * Reusable across entities that need a human-readable sequence number —
 * Job Cards now, Invoices/Estimates in later phases — pass a distinct
 * `entityType` per entity ("JOB_CARD", "INVOICE", "ESTIMATE", …).
 */
export async function generateSequenceNumber(
  tx: Prisma.TransactionClient,
  tenantId: string,
  entityType: string,
  prefix: string,
  padLength = 4,
): Promise<string> {
  const seq = await tx.tenantSequence.upsert({
    where: { tenantId_entityType: { tenantId, entityType } },
    update: { lastNumber: { increment: 1 } },
    create: { tenantId, entityType, lastNumber: 1 },
  });
  return formatSequenceNumber(prefix, seq.lastNumber, padLength);
}
