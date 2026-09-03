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
exports.ReceiveGoodsDto = exports.ReceiveGoodsItemDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class ReceiveGoodsItemDto {
}
exports.ReceiveGoodsItemDto = ReceiveGoodsItemDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ReceiveGoodsItemDto.prototype, "purchaseOrderItemId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 50.5 }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 3 }),
    (0, class_validator_1.Min)(0.001),
    __metadata("design:type", Number)
], ReceiveGoodsItemDto.prototype, "quantityReceived", void 0);
class ReceiveGoodsDto {
}
exports.ReceiveGoodsDto = ReceiveGoodsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [ReceiveGoodsItemDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ReceiveGoodsItemDto),
    __metadata("design:type", Array)
], ReceiveGoodsDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReceiveGoodsDto.prototype, "notes", void 0);
//# sourceMappingURL=receive-goods.dto.js.map