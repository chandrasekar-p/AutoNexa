"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const default_role_grants_1 = require("../src/modules/roles/default-role-grants");
const prisma = new client_1.PrismaClient();
const isDryRun = process.argv.includes('--dry-run');
async function main() {
    if (isDryRun)
        console.log('--- DRY RUN — no rows will be written ---');
    console.log('Ensuring the full permission catalogue exists...');
    const permissionByKey = new Map();
    for (const resource of default_role_grants_1.RESOURCES) {
        for (const action of default_role_grants_1.ACTIONS) {
            if (isDryRun) {
                const existing = await prisma.permission.findUnique({ where: { resource_action: { resource, action } } });
                if (!existing)
                    console.log(`  [dry-run] would create permission ${resource}:${action}`);
                if (existing)
                    permissionByKey.set(`${resource}:${action}`, existing.id);
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
        for (const [roleName, grants] of Object.entries(default_role_grants_1.DEFAULT_ROLE_GRANTS)) {
            const role = await prisma.role.findFirst({ where: { tenantId: tenant.id, name: roleName } });
            if (!role)
                continue;
            for (const resource of default_role_grants_1.RESOURCES) {
                const grant = grants[resource];
                if (!grant)
                    continue;
                const actions = grant === '*' ? default_role_grants_1.ACTIONS : grant;
                for (const action of actions) {
                    const permId = permissionByKey.get(`${resource}:${action}`);
                    if (!permId)
                        continue;
                    const existing = await prisma.rolePermission.findFirst({ where: { roleId: role.id, permissionId: permId } });
                    if (existing)
                        continue;
                    if (isDryRun) {
                        console.log(`  [dry-run] would grant ${resource}:${action} to "${roleName}" in tenant ${tenant.slug}`);
                    }
                    else {
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
//# sourceMappingURL=backfill-role-permissions.js.map