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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const argon2 = __importStar(require("argon2"));
const prisma_service_1 = require("../../prisma/prisma.service");
const storage_types_1 = require("../storage/storage.types");
const resolve_display_url_1 = require("../storage/resolve-display-url");
const SAFE_SELECT = {
    id: true,
    name: true,
    email: true,
    phone: true,
    avatarUrl: true,
    isActive: true,
    branchId: true,
    lastLoginAt: true,
    createdAt: true,
    roles: { select: { role: { select: { id: true, name: true } } } },
};
let UsersService = class UsersService {
    constructor(prisma, storage) {
        this.prisma = prisma;
        this.storage = storage;
    }
    async create(dto) {
        const db = this.prisma.forTenant();
        const existing = await db.user.findFirst({ where: { email: dto.email } });
        if (existing)
            throw new common_1.ConflictException('A user with this email already exists in this workshop');
        await this.assertRolesBelongToTenant(dto.roleIds);
        const passwordHash = await argon2.hash(dto.password);
        const user = await db.user.create({
            data: {
                name: dto.name,
                email: dto.email,
                phone: dto.phone,
                branchId: dto.branchId,
                passwordHash,
                roles: { create: dto.roleIds.map((roleId) => ({ roleId })) },
            },
            select: SAFE_SELECT,
        });
        return user;
    }
    async findAll() {
        const users = await this.prisma.forTenant().user.findMany({
            where: { deletedAt: null },
            select: SAFE_SELECT,
            orderBy: { createdAt: 'desc' },
        });
        return Promise.all(users.map(async (user) => ({ ...user, avatarUrl: await (0, resolve_display_url_1.resolveDisplayUrl)(this.storage, user.avatarUrl) })));
    }
    async findOne(id) {
        const user = await this.prisma.forTenant().user.findFirst({
            where: { id, deletedAt: null },
            select: SAFE_SELECT,
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return { ...user, avatarUrl: await (0, resolve_display_url_1.resolveDisplayUrl)(this.storage, user.avatarUrl) };
    }
    async update(id, dto) {
        await this.findOne(id);
        const db = this.prisma.forTenant();
        if (dto.roleIds) {
            await this.assertRolesBelongToTenant(dto.roleIds);
            await db.userRole.deleteMany({ where: { userId: id } });
        }
        const [user] = await Promise.all([
            db.user.update({
                where: { id },
                data: {
                    name: dto.name,
                    phone: dto.phone,
                    avatarUrl: dto.avatarUrl,
                    branchId: dto.branchId,
                    isActive: dto.isActive,
                    ...(dto.roleIds ? { roles: { create: dto.roleIds.map((roleId) => ({ roleId })) } } : {}),
                },
                select: SAFE_SELECT,
            }),
            dto.isActive === false
                ? this.prisma.platform.refreshToken.updateMany({
                    where: { userId: id, revokedAt: null },
                    data: { revokedAt: new Date() },
                })
                : Promise.resolve(),
        ]);
        return user;
    }
    async remove(id) {
        await this.findOne(id);
        const [user] = await Promise.all([
            this.prisma.forTenant().user.update({
                where: { id },
                data: { deletedAt: new Date(), isActive: false },
                select: SAFE_SELECT,
            }),
            this.prisma.platform.refreshToken.updateMany({
                where: { userId: id, revokedAt: null },
                data: { revokedAt: new Date() },
            }),
        ]);
        return user;
    }
    findOwnProfile(userId) {
        return this.findOne(userId);
    }
    updateOwnProfile(userId, dto) {
        return this.prisma.forTenant().user.update({
            where: { id: userId },
            data: { name: dto.name, phone: dto.phone, avatarUrl: dto.avatarUrl },
            select: SAFE_SELECT,
        });
    }
    async changeOwnPassword(userId, dto) {
        const db = this.prisma.forTenant();
        const user = await db.user.findFirst({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const valid = await argon2.verify(user.passwordHash, dto.currentPassword);
        if (!valid)
            throw new common_1.BadRequestException('Current password is incorrect');
        const passwordHash = await argon2.hash(dto.newPassword);
        await db.user.update({ where: { id: userId }, data: { passwordHash } });
        return { success: true };
    }
    async adminSetPassword(id, dto) {
        await this.findOne(id);
        const passwordHash = await argon2.hash(dto.newPassword);
        await this.prisma.forTenant().user.update({ where: { id }, data: { passwordHash } });
        return { success: true, id };
    }
    async assertRolesBelongToTenant(roleIds) {
        if (roleIds.length === 0)
            throw new common_1.BadRequestException('At least one role is required');
        const roles = await this.prisma.forTenant().role.findMany({ where: { id: { in: roleIds } } });
        if (roles.length !== roleIds.length) {
            throw new common_1.BadRequestException('One or more role IDs are invalid for this workshop');
        }
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(storage_types_1.STORAGE_SERVICE)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object])
], UsersService);
//# sourceMappingURL=users.service.js.map