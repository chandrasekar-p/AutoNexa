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
exports.CreateServicePackageDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const uuid_like_1 = require("../../../common/validators/uuid-like");
class CreateServicePackageDto {
}
exports.CreateServicePackageDto = CreateServicePackageDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Annual Maintenance Contract — Basic' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateServicePackageDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateServicePackageDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 4999 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateServicePackageDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 18 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateServicePackageDto.prototype, "gstRate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 12, description: 'How long this package is valid for once sold' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateServicePackageDto.prototype, "validityMonths", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Max redeemable visits within the validity period; omit for unlimited' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateServicePackageDto.prototype, "visitLimit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateServicePackageDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [String], description: 'LabourItem ids this package covers for free' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.Matches)(uuid_like_1.UUID_SHAPE_REGEX, { each: true, message: uuid_like_1.INVALID_UUID_MESSAGE }),
    __metadata("design:type", Array)
], CreateServicePackageDto.prototype, "labourItemIds", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [String], description: 'Part ids this package covers for free' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.Matches)(uuid_like_1.UUID_SHAPE_REGEX, { each: true, message: uuid_like_1.INVALID_UUID_MESSAGE }),
    __metadata("design:type", Array)
], CreateServicePackageDto.prototype, "partIds", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [String], description: 'PartCategory ids this package covers for free (any part in these categories)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.Matches)(uuid_like_1.UUID_SHAPE_REGEX, { each: true, message: uuid_like_1.INVALID_UUID_MESSAGE }),
    __metadata("design:type", Array)
], CreateServicePackageDto.prototype, "partCategoryIds", void 0);
//# sourceMappingURL=create-service-package.dto.js.map