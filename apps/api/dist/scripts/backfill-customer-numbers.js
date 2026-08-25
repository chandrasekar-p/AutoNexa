"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const generate_sequence_number_1 = require("../src/common/sequence/generate-sequence-number");
const prisma = new client_1.PrismaClient();
const isDryRun = process.argv.includes('--dry-run');
async function main() {
    if (isDryRun)
        console.log('--- DRY RUN — no rows will be written ---');
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
        if (unnumbered.length === 0)
            continue;
        console.log(`  Tenant ${tenant.slug}: ${unnumbered.length} customer(s) to number...`);
        for (const customer of unnumbered) {
            if (isDryRun) {
                console.log(`    [dry-run] would assign a number to customer ${customer.id} (created ${customer.createdAt.toISOString()})`);
                assigned++;
                continue;
            }
            await prisma.$transaction(async (tx) => {
                const customerNumber = await (0, generate_sequence_number_1.generateSequenceNumber)(tx, tenant.id, 'CUSTOMER', prefix);
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
//# sourceMappingURL=backfill-customer-numbers.js.map