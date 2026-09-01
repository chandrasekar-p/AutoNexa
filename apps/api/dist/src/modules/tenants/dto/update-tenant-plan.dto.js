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
exports.UpdateTenantPlanDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const create_tenant_dto_1 = require("./create-tenant.dto");
const PLAN_TIERS_WITH_LEGACY = [...create_tenant_dto_1.PLAN_TIERS, 'standard'];
class UpdateTenantPlanDto {
}
exports.UpdateTenantPlanDto = UpdateTenantPlanDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: PLAN_TIERS_WITH_LEGACY }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(PLAN_TIERS_WITH_LEGACY),
    __metadata("design:type", String)
], UpdateTenantPlanDto.prototype, "planTier", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-12-31T00:00:00.000Z', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsISO8601)(),
    __metadata("design:type", Object)
], UpdateTenantPlanDto.prototype, "trialEndsAt", void 0);
//# sourceMappingURL=update-tenant-plan.dto.js.map