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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const tenants_service_1 = require("./tenants.service");
const create_tenant_dto_1 = require("./dto/create-tenant.dto");
const update_tenant_settings_dto_1 = require("./dto/update-tenant-settings.dto");
const super_admin_guard_1 = require("../../common/guards/super-admin.guard");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const audit_log_interceptor_1 = require("../../common/interceptors/audit-log.interceptor");
let TenantsController = class TenantsController {
    constructor(tenantsService) {
        this.tenantsService = tenantsService;
    }
    provisionTenant(dto) {
        return this.tenantsService.provisionTenant(dto);
    }
    listAll() {
        return this.tenantsService.listAll();
    }
    getBranding(slug) {
        return this.tenantsService.getBrandingBySlug(slug);
    }
    getCurrentTenant() {
        return this.tenantsService.getCurrentTenant();
    }
    updateSettings(dto) {
        return this.tenantsService.updateSettings(dto);
    }
};
exports.TenantsController = TenantsController;
__decorate([
    (0, common_1.UseGuards)(super_admin_guard_1.SuperAdminGuard),
    (0, common_1.Post)(),
    (0, audit_log_interceptor_1.Audit)('tenant.create', 'Tenant'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_tenant_dto_1.CreateTenantDto]),
    __metadata("design:returntype", void 0)
], TenantsController.prototype, "provisionTenant", null);
__decorate([
    (0, common_1.UseGuards)(super_admin_guard_1.SuperAdminGuard),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TenantsController.prototype, "listAll", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('branding/:slug'),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TenantsController.prototype, "getBranding", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('tenant:read'),
    (0, common_1.Get)('me'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TenantsController.prototype, "getCurrentTenant", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('settings:update'),
    (0, common_1.Patch)('me/settings'),
    (0, audit_log_interceptor_1.Audit)('tenant.settings.update', 'TenantSettings'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_tenant_settings_dto_1.UpdateTenantSettingsDto]),
    __metadata("design:returntype", void 0)
], TenantsController.prototype, "updateSettings", null);
exports.TenantsController = TenantsController = __decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('tenants'),
    (0, common_1.Controller)('tenants'),
    __metadata("design:paramtypes", [tenants_service_1.TenantsService])
], TenantsController);
//# sourceMappingURL=tenants.controller.js.map