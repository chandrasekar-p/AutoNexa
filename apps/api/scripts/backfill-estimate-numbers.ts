/**
 * One-off: assigns Estimate.estimateNumber to every pre-existing estimate
 * that doesn't have one yet (added by the same-day migration
 * 20260825091557_add_estimate_number — nullable specifically so existing
 * rows don't need a value at migration time). Numbers are assigned in
 * `createdAt` order, per tenant, via the same generateSequenceNumber()
 * (common/sequence/generate-sequence-number.ts) that EstimatesService.create()
 * now uses going forward — this continues each tenant's TenantSequence
 * counter for entityType 'ESTIMATE', so a newly-created estimate right
 * after this runs picks up the next number with no collision.
 *
 * Run sequentially (not in parallel) per tenant so the assigned numbers
 * stay in the same order as createdAt, not an arbitrary interleaving.
 *
 * Idempotent: only ever touches rows where estimateNumber IS NULL, safe to
 * re-run.
 *
 * Usage: npm run backfill:estimate-numbers -- --dry-run
 */
import { PrismaClient } from '@prisma/client'; // imported first — see migrate-uploads-to-s3.ts's identical note on why
import { generateSequenceNumber } from '../src/common/sequence/generate-sequence-number';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');

async function main() {
  if (isDryRun) console.log('--- DRY RUN — no rows will be written ---');

  const tenants = await prisma.tenant.findMany({ where: { deletedAt: null, NOT: { slug: 'platform' } } });
  console.log(`Backfilling ${tenants.length} tenant(s)...`);

  let assigned = 0;
  for (const tenant of tenants) {
    const settings = await prisma.tenantSettings.findUnique({ where: { tenantId: tenant.id } });
    const prefix = settings?.estimatePrefix ?? 'EST';

    const unnumbered = await prisma.estimate.findMany({
      where: { tenantId: tenant.id, estimateNumber: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, createdAt: true },
    });
    if (unnumbered.length === 0) continue;

    console.log(`  Tenant ${tenant.slug}: ${unnumbered.length} estimate(s) to number...`);
    for (const estimate of unnumbered) {
      if (isDryRun) {
        console.log(`    [dry-run] would assign a number to estimate ${estimate.id} (created ${estimate.createdAt.toISOString()})`);
        assigned++;
        continue;
      }
      await prisma.$transaction(async (tx) => {
        const estimateNumber = await generateSequenceNumber(tx, tenant.id, 'ESTIMATE', prefix);
        await tx.estimate.update({ where: { id: estimate.id }, data: { estimateNumber } });
      });
      assigned++;
    }
  }

  console.log(isDryRun ? `Dry run complete — ${assigned} estimate(s) would be numbered.` : `Done — ${assigned} estimate(s) numbered.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
