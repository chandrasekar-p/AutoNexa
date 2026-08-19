"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const argon2 = __importStar(require("argon2"));
const default_role_grants_1 = require("../src/modules/roles/default-role-grants");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding permission catalogue…');
    const permissionByKey = new Map();
    for (const resource of default_role_grants_1.RESOURCES) {
        for (const action of default_role_grants_1.ACTIONS) {
            const perm = await prisma.permission.upsert({
                where: { resource_action: { resource, action } },
                update: {},
                create: { resource, action },
            });
            permissionByKey.set(`${resource}:${action}`, perm.id);
        }
    }
    console.log('Seeding platform-level SUPER_ADMIN role + user…');
    const superAdminRole = (await prisma.role.findFirst({ where: { tenantId: null, name: 'Super Admin' } })) ??
        (await prisma.role.create({ data: { tenantId: null, name: 'Super Admin', isSystem: true } }));
    for (const permId of permissionByKey.values()) {
        await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: permId } },
            update: {},
            create: { roleId: superAdminRole.id, permissionId: permId },
        });
    }
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@autonexa.app';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD ?? 'change-me';
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
        where: { id: `${demoTenant.id}-main` },
        update: {},
        create: { id: `${demoTenant.id}-main`, tenantId: demoTenant.id, name: 'Main Branch', city: 'Coimbatore' },
    }).catch(async () => {
        await prisma.branch.create({ data: { tenantId: demoTenant.id, name: 'Main Branch', city: 'Coimbatore' } });
    });
    for (const [roleName, grants] of Object.entries(default_role_grants_1.DEFAULT_ROLE_GRANTS)) {
        const role = await prisma.role.upsert({
            where: { tenantId_name: { tenantId: demoTenant.id, name: roleName } },
            update: {},
            create: { tenantId: demoTenant.id, name: roleName, isSystem: false },
        });
        for (const resource of default_role_grants_1.RESOURCES) {
            const grant = grants[resource];
            if (!grant)
                continue;
            const actions = grant === '*' ? default_role_grants_1.ACTIONS : grant;
            for (const action of actions) {
                const permId = permissionByKey.get(`${resource}:${action}`);
                if (!permId)
                    continue;
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
//# sourceMappingURL=seed.js.map