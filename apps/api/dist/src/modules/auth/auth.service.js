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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const argon2 = __importStar(require("argon2"));
const node_crypto_1 = require("node:crypto");
const prisma_service_1 = require("../../prisma/prisma.service");
function isSuperAdminUser(user) {
    return user.roles.some((ur) => ur.role.name === 'Super Admin' && ur.role.isSystem);
}
function flattenPermissions(user) {
    return Array.from(new Set(user.roles.flatMap((ur) => ur.role.permissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`))));
}
let AuthService = class AuthService {
    constructor(prisma, jwt, config) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
    }
    async login(dto, meta) {
        const tenant = await this.prisma.platform.tenant.findUnique({
            where: { slug: dto.tenantSlug },
        });
        if (!tenant || !tenant.isActive) {
            throw new common_1.UnauthorizedException('Invalid workshop, email, or password');
        }
        const user = await this.prisma.platform.user.findUnique({
            where: { tenantId_email: { tenantId: tenant.id, email: dto.email } },
            include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
        });
        if (!user || !user.isActive || user.deletedAt) {
            throw new common_1.UnauthorizedException('Invalid workshop, email, or password');
        }
        const passwordValid = await argon2.verify(user.passwordHash, dto.password);
        if (!passwordValid) {
            throw new common_1.UnauthorizedException('Invalid workshop, email, or password');
        }
        const isSuperAdmin = isSuperAdminUser(user);
        const permissions = flattenPermissions(user);
        const tokens = await this.issueTokens({ userId: user.id, tenantId: tenant.id, email: user.email, permissions, isSuperAdmin }, meta);
        await this.prisma.platform.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        return {
            ...tokens,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                tenantId: tenant.id,
                roles: user.roles.map((ur) => ur.role.name),
            },
        };
    }
    async refresh(rawRefreshToken, meta) {
        if (!rawRefreshToken)
            throw new common_1.UnauthorizedException('Missing refresh token');
        const tokenHash = hashToken(rawRefreshToken);
        const stored = await this.prisma.platform.refreshToken.findFirst({
            where: { tokenHash },
            include: { user: { include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } } },
        });
        if (!stored)
            throw new common_1.UnauthorizedException('Invalid refresh token');
        if (stored.revokedAt) {
            await this.prisma.platform.refreshToken.updateMany({
                where: { familyId: stored.familyId, revokedAt: null },
                data: { revokedAt: new Date() },
            });
            throw new common_1.UnauthorizedException('Refresh token reuse detected — please log in again');
        }
        if (stored.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Refresh token expired');
        }
        const user = stored.user;
        if (!user.isActive || user.deletedAt) {
            await this.prisma.platform.refreshToken.updateMany({
                where: { familyId: stored.familyId, revokedAt: null },
                data: { revokedAt: new Date() },
            });
            throw new common_1.UnauthorizedException('Account is no longer active — please contact your workshop admin');
        }
        const isSuperAdmin = isSuperAdminUser(user);
        const permissions = flattenPermissions(user);
        const tokens = await this.issueTokens({ userId: user.id, tenantId: user.tenantId, email: user.email, permissions, isSuperAdmin }, meta, stored.familyId);
        await this.prisma.platform.refreshToken.update({
            where: { id: stored.id },
            data: { revokedAt: new Date(), replacedBy: tokens.refreshToken.slice(0, 12) },
        });
        return tokens;
    }
    async logout(rawRefreshToken) {
        if (!rawRefreshToken)
            return;
        const tokenHash = hashToken(rawRefreshToken);
        await this.prisma.platform.refreshToken.updateMany({
            where: { tokenHash, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
    async issueTokens(claims, meta, familyId = (0, node_crypto_1.randomUUID)()) {
        const accessExpiresIn = this.config.get('jwt.accessExpiresIn');
        const refreshExpiresIn = this.config.get('jwt.refreshExpiresIn');
        const accessToken = await this.jwt.signAsync({
            sub: claims.userId,
            tenantId: claims.tenantId,
            email: claims.email,
            permissions: claims.permissions,
            isSuperAdmin: claims.isSuperAdmin,
        }, { secret: this.config.get('jwt.accessSecret'), expiresIn: accessExpiresIn });
        const rawRefreshToken = (0, node_crypto_1.randomUUID)() + (0, node_crypto_1.randomUUID)();
        const tokenHash = hashToken(rawRefreshToken);
        await this.prisma.platform.refreshToken.create({
            data: {
                userId: claims.userId,
                tokenHash,
                familyId,
                expiresAt: addDuration(new Date(), refreshExpiresIn),
                ipAddress: meta.ip,
                userAgent: meta.userAgent,
            },
        });
        return { accessToken, refreshToken: rawRefreshToken, expiresIn: accessExpiresIn };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
function hashToken(raw) {
    return (0, node_crypto_1.createHash)('sha256').update(raw).digest('hex');
}
function addDuration(base, spec) {
    const match = spec.match(/^(\d+)([smhd])$/);
    if (!match)
        throw new Error(`Unsupported duration format: ${spec}`);
    const [, amountStr, unit] = match;
    const amount = parseInt(amountStr, 10);
    const multiplier = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
    return new Date(base.getTime() + amount * multiplier);
}
//# sourceMappingURL=auth.service.js.map