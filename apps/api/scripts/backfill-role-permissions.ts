/**
 * One-off: grants newly-added resource:action permissions (e.g.
 * 'service-package', 'loyalty' from the AMC/loyalty phase) to already-
 * provisioned tenants' DEFAULT roles. default-role-grants.ts is read by
 * prisma/seed.ts (fresh seed) and TenantsService.provisionTenant (a BRAND
 * NEW tenant) — neither one touches a tenant that was already provisioned
 * before this file changed, so adding a new resource to RESOURCES/
 * DEFAULT_ROLE_GRANTS silently does nothing for existing tenants until
 * this runs once.
 *
 * Idempotent: every write is an upsert/skip-if-exists, safe to run
 * multiple times or after any future addition to default-role-grants.ts.
 * Only touches roles whose NAME matches a key in DEFAULT_ROLE_GRANTS
 * (the known default roles) — a tenant's own custom-named roles are never
 * modified.
 *
 * Usage: npm run backfill:role-permissions -- --dry-run
 */
import { PrismaClient } from '@prisma/client'; // imported first — see migrate-uploads-to-s3.ts's identical note on why
import { RESOURCES, ACTIONS, DEFAULT_ROLE_GRANTS } from '../src/modules/roles/default-role-grants';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');

async function main() {
  if (isDryRun) console.log('--- DRY RUN — no rows will be written ---');

  console.log('Ensuring the full permission catalogue exists...');
  const permissionByKey = new Map<string, string>();
  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      if (isDryRun) {
        const existing = await prisma.permission.findUnique({ where: { resource_action: { resource, action } } });
        if (!existing) console.log(`  [dry-run] would create permission ${resource}:${action}`);
        if (existing) permissionByKey.set(`${resource}:${action}`, existing.id);
        continue;
      }
      const perm = await prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        update: {},
        create: { resource, action },
      });
      permissionByKey.set(`${resource}:${action}`, perm.id);
    }
  }

  const tenants = await prisma.tenant.findMany({ where: { deletedAt: null, NOT: { slug: 'platform' } } });
  console.log(`Backfilling ${tenants.length} tenant(s)...`);

  let grantsAdded = 0;
  for (const tenant of tenants) {
    for (const [roleName, grants] of Object.entries(DEFAULT_ROLE_GRANTS)) {
      const role = await prisma.role.findFirst({ where: { tenantId: tenant.id, name: roleName } });
      if (!role) continue; // this tenant never had (or renamed away) this default role — don't recreate it

      for (const resource of RESOURCES) {
        const grant = grants[resource];
        if (!grant) continue;
        const actions = grant === '*' ? ACTIONS : grant;
        for (const action of actions) {
          const permId = permissionByKey.get(`${resource}:${action}`);
          if (!permId) continue;

          const existing = await prisma.rolePermission.findFirst({ where: { roleId: role.id, permissionId: permId } });
          if (existing) continue;

          if (isDryRun) {
            console.log(`  [dry-run] would grant ${resource}:${action} to "${roleName}" in tenant ${tenant.slug}`);
          } else {
            await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permId } });
          }
          grantsAdded++;
        }
      }
    }
  }

  console.log(isDryRun ? `Dry run complete — ${grantsAdded} grant(s) would be added.` : `Done — ${grantsAdded} grant(s) added.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
