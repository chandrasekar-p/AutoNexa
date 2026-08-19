"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const ROLE_SELECT = {
    id: true,
    name: true,
    isSystem: true,
    permissions: { select: { permission: { select: { id: true, resource: true, action: true } } } },
};
let RolesService = class RolesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        const roles = await this.prisma.forTenant().role.findMany({
            where: { name: { not: 'Super Admin' } },
            select: ROLE_SELECT,
            orderBy: { name: 'asc' },
        });
        return roles;
    }
    async findOne(id) {
        const role = await this.prisma.forTenant().role.findFirst({ where: { id }, select: ROLE_SELECT });
        if (!role)
            throw new common_1.NotFoundException('Role not found');
        return role;
    }
    async create(dto) {
        await this.assertPermissionsExist(dto.permissionIds);
        return this.prisma.forTenant().role.create({
            data: {
                name: dto.name,
                isSystem: false,
                permissions: { create: dto.permissionIds.map((permissionId) => ({ permissionId })) },
            },
            select: ROLE_SELECT,
        });
    }
    async update(id, dto) {
        const role = await this.findOne(id);
        if (role.isSystem)
            throw new common_1.ForbiddenException('System roles cannot be modified');
        const db = this.prisma.forTenant();
        if (dto.permissionIds) {
            await this.assertPermissionsExist(dto.permissionIds);
            await db.rolePermission.deleteMany({ where: { roleId: id } });
        }
        return db.role.update({
            where: { id },
            data: {
                name: dto.name,
                ...(dto.permissionIds
                    ? { permissions: { create: dto.permissionIds.map((permissionId) => ({ permissionId })) } }
                    : {}),
            },
            select: ROLE_SELECT,
        });
    }
    async remove(id) {
        const role = await this.findOne(id);
        if (role.isSystem)
            throw new common_1.ForbiddenException('System roles cannot be deleted');
        const assignedCount = await this.prisma.forTenant().userRole.count({ where: { roleId: id } });
        if (assignedCount > 0) {
            throw new common_1.BadRequestException(`Cannot delete role: ${assignedCount} user(s) are still assigned to it. Reassign them first.`);
        }
        return this.prisma.forTenant().role.delete({ where: { id } });
    }
    async assertPermissionsExist(permissionIds) {
        if (permissionIds.length === 0)
            throw new common_1.BadRequestException('At least one permission is required');
        const found = await this.prisma.platform.permission.findMany({ where: { id: { in: permissionIds } } });
        if (found.length !== permissionIds.length) {
            throw new common_1.BadRequestException('One or more permission IDs are invalid');
        }
    }
};
exports.RolesService = RolesService;
exports.RolesService = RolesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RolesService);
//# sourceMappingURL=roles.service.js.map