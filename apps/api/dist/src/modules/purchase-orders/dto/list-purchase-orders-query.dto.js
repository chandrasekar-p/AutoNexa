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
exports.ListPurchaseOrdersQueryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
const PURCHASE_ORDER_BUCKETS = ['pending', 'received', 'cancelled'];
class ListPurchaseOrdersQueryDto {
    constructor() {
        this.page = 1;
        this.pageSize = 20;
    }
}
exports.ListPurchaseOrdersQueryDto = ListPurchaseOrdersQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Free-text search across PO number' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListPurchaseOrdersQueryDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ListPurchaseOrdersQueryDto.prototype, "supplierId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.PurchaseOrderStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.PurchaseOrderStatus),
    __metadata("design:type", String)
], ListPurchaseOrdersQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: PURCHASE_ORDER_BUCKETS,
        description: 'Derived status grouping for the KPI quick-filters — ignored if `status` is also given',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(PURCHASE_ORDER_BUCKETS),
    __metadata("design:type", String)
], ListPurchaseOrdersQueryDto.prototype, "bucket", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ISO date — orders created on/after this date' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListPurchaseOrdersQueryDto.prototype, "from", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ISO date — orders created on/before this date' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListPurchaseOrdersQueryDto.prototype, "to", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ISO date — expected delivery on/after this date' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListPurchaseOrdersQueryDto.prototype, "expectedFrom", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ISO date — expected delivery on/before this date' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListPurchaseOrdersQueryDto.prototype, "expectedTo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Minimum order value (sum of line totals)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ListPurchaseOrdersQueryDto.prototype, "minValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Maximum order value (sum of line totals)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ListPurchaseOrdersQueryDto.prototype, "maxValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ListPurchaseOrdersQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 20 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], ListPurchaseOrdersQueryDto.prototype, "pageSize", void 0);
//# sourceMappingURL=list-purchase-orders-query.dto.js.map