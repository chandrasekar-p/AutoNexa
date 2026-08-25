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
exports.ListVehiclesQueryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const uuid_like_1 = require("../../../common/validators/uuid-like");
const EXPIRY_FILTER_VALUES = ['active', 'expiring_soon', 'expired', 'not_set'];
class ListVehiclesQueryDto {
    constructor() {
        this.page = 1;
        this.pageSize = 20;
    }
}
exports.ListVehiclesQueryDto = ListVehiclesQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Free-text search across registration number, VIN, brand, model' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListVehiclesQueryDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(uuid_like_1.UUID_SHAPE_REGEX, { message: uuid_like_1.INVALID_UUID_MESSAGE }),
    __metadata("design:type", String)
], ListVehiclesQueryDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['ACTIVE', 'EXPIRED', 'NO_DATA'], description: 'The combined per-row status (see vehicle-status.ts)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['ACTIVE', 'EXPIRED', 'NO_DATA']),
    __metadata("design:type", String)
], ListVehiclesQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: EXPIRY_FILTER_VALUES }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(EXPIRY_FILTER_VALUES),
    __metadata("design:type", Object)
], ListVehiclesQueryDto.prototype, "insurance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: EXPIRY_FILTER_VALUES }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(EXPIRY_FILTER_VALUES),
    __metadata("design:type", Object)
], ListVehiclesQueryDto.prototype, "puc", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ListVehiclesQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 20 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], ListVehiclesQueryDto.prototype, "pageSize", void 0);
//# sourceMappingURL=list-vehicles-query.dto.js.map