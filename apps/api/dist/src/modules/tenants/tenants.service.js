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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantsService = void 0;
const common_1 = require("@nestjs/common");
const argon2 = __importStar(require("argon2"));
const prisma_service_1 = require("../../prisma/prisma.service");
const tenant_context_1 = require("../../prisma/tenant-context");
const default_role_grants_1 = require("../roles/default-role-grants");
let TenantsService = class TenantsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async provisionTenant(dto) {
        const existing = await this.prisma.platform.tenant.findUnique({ where: { slug: dto.slug } });
        if (existing)
            throw new common_1.ConflictException(`Slug "${dto.slug}" is already in use`);
        return this.prisma.platform.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    name: dto.name,
                    slug: dto.slug,
                    gstin: dto.gstin,
                    settings: { create: {} },
                },
            });
            const permissionByKey = new Map();
            for (const resource of default_role_grants_1.RESOURCES) {
                for (const action of default_role_grants_1.ACTIONS) {
                    const perm = await tx.permission.upsert({
                        where: { resource_action: { resource, action } },
                        update: {},
                        create: { resource, action },
                    });
                    permissionByKey.set(`${resource}:${action}`, perm.id);
                }
            }
            let ownerRoleId;
            for (const [roleName, grants] of Object.entries(default_role_grants_1.DEFAULT_ROLE_GRANTS)) {
                const role = await tx.role.create({
                    data: { tenantId: tenant.id, name: roleName, isSystem: false },
                });
                if (roleName === 'Workshop Owner')
                    ownerRoleId = role.id;
                for (const resource of default_role_grants_1.RESOURCES) {
                    const grant = grants[resource];
                    if (!grant)
                        continue;
                    const actions = grant === '*' ? default_role_grants_1.ACTIONS : grant;
                    for (const action of actions) {
                        const permId = permissionByKey.get(`${resource}:${action}`);
                        if (!permId)
                            continue;
                        await tx.rolePermission.create({ data: { roleId: role.id, permissionId: permId } });
                    }
                }
            }
            const passwordHash = await argon2.hash(dto.ownerPassword);
            const owner = await tx.user.create({
                data: {
                    tenantId: tenant.id,
                    name: dto.ownerName,
                    email: dto.ownerEmail,
                    passwordHash,
                },
            });
            await tx.userRole.create({ data: { userId: owner.id, roleId: ownerRoleId } });
            return { tenant, ownerId: owner.id };
        });
    }
    async listAll() {
        return this.prisma.platform.tenant.findMany({
            where: { deletedAt: null, NOT: { slug: 'platform' } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getCurrentTenant() {
        const tenantId = tenant_context_1.TenantContext.requireTenantId();
        const tenant = await this.prisma.platform.tenant.findUnique({
            where: { id: tenantId },
            include: { settings: true, branches: { where: { deletedAt: null } } },
        });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant not found');
        return tenant;
    }
    async updateSettings(dto) {
        const tenantId = tenant_context_1.TenantContext.requireTenantId();
        return this.prisma.platform.tenantSettings.update({
            where: { tenantId },
            data: dto,
        });
    }
};
exports.TenantsService = TenantsService;
exports.TenantsService = TenantsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TenantsService);
//# sourceMappingURL=tenants.service.js.map