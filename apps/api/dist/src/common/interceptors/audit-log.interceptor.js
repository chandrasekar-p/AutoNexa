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
exports.AuditLogInterceptor = exports.Audit = exports.AUDIT_KEY = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const common_2 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const prisma_service_1 = require("../../prisma/prisma.service");
exports.AUDIT_KEY = 'audit';
const Audit = (action, entity) => (0, common_2.SetMetadata)(exports.AUDIT_KEY, { action, entity });
exports.Audit = Audit;
let AuditLogInterceptor = class AuditLogInterceptor {
    constructor(reflector, prisma) {
        this.reflector = reflector;
        this.prisma = prisma;
    }
    intercept(context, next) {
        const meta = this.reflector.get(exports.AUDIT_KEY, context.getHandler());
        if (!meta)
            return next.handle();
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        return next.handle().pipe((0, rxjs_1.tap)(async (result) => {
            if (!user)
                return;
            await this.prisma.platform.auditLog.create({
                data: {
                    tenantId: user.tenantId,
                    userId: user.userId,
                    action: meta.action,
                    entity: meta.entity,
                    entityId: result?.id ?? 'unknown',
                    newValue: result,
                    ipAddress: request.ip,
                },
            });
        }));
    }
};
exports.AuditLogInterceptor = AuditLogInterceptor;
exports.AuditLogInterceptor = AuditLogInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        prisma_service_1.PrismaService])
], AuditLogInterceptor);
//# sourceMappingURL=audit-log.interceptor.js.map