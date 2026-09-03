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
exports.AdjustPartStockDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const part_stock_adjustment_1 = require("../part-stock-adjustment");
class AdjustPartStockDto {
}
exports.AdjustPartStockDto = AdjustPartStockDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['IN', 'OUT'] }),
    (0, class_validator_1.IsIn)(['IN', 'OUT']),
    __metadata("design:type", String)
], AdjustPartStockDto.prototype, "direction", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ minimum: 0.001, example: 2.5 }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 3 }),
    (0, class_validator_1.Min)(0.001),
    __metadata("design:type", Number)
], AdjustPartStockDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: part_stock_adjustment_1.STOCK_ADJUSTMENT_REASONS }),
    (0, class_validator_1.IsIn)(part_stock_adjustment_1.STOCK_ADJUSTMENT_REASONS),
    __metadata("design:type", String)
], AdjustPartStockDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdjustPartStockDto.prototype, "notes", void 0);
//# sourceMappingURL=adjust-part-stock.dto.js.map