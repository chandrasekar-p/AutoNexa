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
exports.CreateTenantDto = exports.PLAN_TIERS = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
exports.PLAN_TIERS = ['trial', 'starter', 'pro'];
class CreateTenantDto {
}
exports.CreateTenantDto = CreateTenantDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Premium Auto Coimbatore' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTenantDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'premium-auto-cbe', description: 'URL-safe unique slug' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[a-z0-9-]+$/, { message: 'slug must be lowercase letters, numbers, and hyphens only' }),
    __metadata("design:type", String)
], CreateTenantDto.prototype, "slug", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTenantDto.prototype, "gstin", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Owner Name' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTenantDto.prototype, "ownerName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'owner@premiumauto.example' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateTenantDto.prototype, "ownerEmail", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTenantDto.prototype, "ownerPassword", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: exports.PLAN_TIERS, example: 'trial', description: 'Defaults to "standard" (permanent, no trial) when omitted' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(exports.PLAN_TIERS),
    __metadata("design:type", String)
], CreateTenantDto.prototype, "planTier", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 14, description: 'Only meaningful when planTier is "trial" — days from creation until trialEndsAt. Defaults to 14.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateTenantDto.prototype, "trialDays", void 0);
//# sourceMappingURL=create-tenant.dto.js.map