/**
 * One-off: assigns Customer.customerNumber to every pre-existing customer
 * that doesn't have one yet (added by the same-day migration
 * 20260825114654_add_customer_number — nullable specifically so existing
 * rows don't need a value at migration time). Same shape as
 * backfill-estimate-numbers.ts: numbers assigned in `createdAt` order per
 * tenant via generateSequenceNumber(), continuing that tenant's
 * TenantSequence counter for entityType 'CUSTOMER' so a newly-created
 * customer right after this runs picks up the next number with no
 * collision.
 *
 * Idempotent: only ever touches rows where customerNumber IS NULL, safe
 * to re-run.
 *
 * Usage: npm run backfill:customer-numbers -- --dry-run
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
    const prefix = settings?.customerPrefix ?? 'CUST';

    const unnumbered = await prisma.customer.findMany({
      where: { tenantId: tenant.id, customerNumber: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, createdAt: true },
    });
    if (unnumbered.length === 0) continue;

    console.log(`  Tenant ${tenant.slug}: ${unnumbered.length} customer(s) to number...`);
    for (const customer of unnumbered) {
      if (isDryRun) {
        console.log(`    [dry-run] would assign a number to customer ${customer.id} (created ${customer.createdAt.toISOString()})`);
        assigned++;
        continue;
      }
      await prisma.$transaction(async (tx) => {
        const customerNumber = await generateSequenceNumber(tx, tenant.id, 'CUSTOMER', prefix);
        await tx.customer.update({ where: { id: customer.id }, data: { customerNumber } });
      });
      assigned++;
    }
  }

  console.log(isDryRun ? `Dry run complete — ${assigned} customer(s) would be numbered.` : `Done — ${assigned} customer(s) numbered.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
