import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { RESOURCES, ACTIONS, DEFAULT_ROLE_GRANTS } from '../src/modules/roles/default-role-grants';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding permission catalogue…');
  const permissionByKey = new Map<string, string>();

  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      const perm = await prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        update: {},
        create: { resource, action },
      });
      permissionByKey.set(`${resource}:${action}`, perm.id);
    }
  }

  console.log('Seeding platform-level SUPER_ADMIN role + user…');
  // Prisma rejects `null` inside a compound-unique `where` filter (tenantId_name),
  // even though tenantId itself is nullable at the column level — so the
  // platform-level (tenantId: null) role can't be upserted via that key and
  // needs a manual findFirst/create instead.
  const superAdminRole =
    (await prisma.role.findFirst({ where: { tenantId: null, name: 'Super Admin' } })) ??
    (await prisma.role.create({ data: { tenantId: null, name: 'Super Admin', isSystem: true } }));

  // Super Admin gets every permission.
  for (const permId of permissionByKey.values()) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: permId } },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: permId },
    });
  }

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@autonexa.app';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD ?? 'change-me';

  // Super Admin is platform-level, not tied to a tenant's business data,
  // but User.tenantId is required by schema — see note in auth module about
  // routing platform auth through a distinct check (isSystemRole) rather than
  // a real workshop tenant. For seeding purposes we create a reserved
  // "platform" tenant that is excluded from business-data listings.
  const platformTenant = await prisma.tenant.upsert({
    where: { slug: 'platform' },
    update: {},
    create: { name: 'AutoNexa Platform', slug: 'platform', planTier: 'internal' },
  });

  const passwordHash = await argon2.hash(superAdminPassword);
  const superAdminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: platformTenant.id, email: superAdminEmail } },
    update: {},
    create: {
      tenantId: platformTenant.id,
      name: 'Super Admin',
      email: superAdminEmail,
      passwordHash,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: superAdminUser.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: superAdminUser.id, roleId: superAdminRole.id },
  });

  console.log('Seeding demo tenant + default roles for local development…');
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'demo-workshop' },
    update: {},
    create: {
      name: 'Demo Premium Workshop',
      slug: 'demo-workshop',
      gstin: '33AAAAA0000A1Z5',
      settings: {
        create: {},
      },
    },
  });

  await prisma.branch.upsert({
    where: { id: `${demoTenant.id}-main` }, // deterministic id not used by default schema; replaced below
    update: {},
    create: { id: `${demoTenant.id}-main`, tenantId: demoTenant.id, name: 'Main Branch', city: 'Coimbatore' },
  }).catch(async () => {
    // id override above is illustrative only — fall back to plain create if the
    // deterministic id collides with the uuid default in a real Postgres run.
    await prisma.branch.create({ data: { tenantId: demoTenant.id, name: 'Main Branch', city: 'Coimbatore' } });
  });

  for (const [roleName, grants] of Object.entries(DEFAULT_ROLE_GRANTS)) {
    const role = await prisma.role.upsert({
      where: { tenantId_name: { tenantId: demoTenant.id, name: roleName } },
      update: {},
      create: { tenantId: demoTenant.id, name: roleName, isSystem: false },
    });

    for (const resource of RESOURCES) {
      const grant = grants[resource];
      if (!grant) continue;
      const actions = grant === '*' ? ACTIONS : grant;
      for (const action of actions) {
        const permId = permissionByKey.get(`${resource}:${action}`);
        if (!permId) continue;
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
          update: {},
          create: { roleId: role.id, permissionId: permId },
        });
      }
    }
  }

  const ownerRole = await prisma.role.findFirstOrThrow({
    where: { tenantId: demoTenant.id, name: 'Workshop Owner' },
  });
  const ownerPasswordHash = await argon2.hash('ChangeMe123!');
  const ownerUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: demoTenant.id, email: 'owner@demoworkshop.test' } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      name: 'Demo Owner',
      email: 'owner@demoworkshop.test',
      passwordHash: ownerPasswordHash,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: ownerUser.id, roleId: ownerRole.id } },
    update: {},
    create: { userId: ownerUser.id, roleId: ownerRole.id },
  });

  console.log('Seed complete.');
  console.log(`Super Admin login: ${superAdminEmail} / (value of SUPER_ADMIN_PASSWORD)`);
  console.log('Demo Owner login: owner@demoworkshop.test / ChangeMe123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
