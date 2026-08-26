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
exports.ListTechniciansQueryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
class ListTechniciansQueryDto {
    constructor() {
        this.page = 1;
        this.pageSize = 20;
    }
}
exports.ListTechniciansQueryDto = ListTechniciansQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Free-text search across technician name, employee ID, specialisation, and an exact skill match' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListTechniciansQueryDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.TechnicianStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.TechnicianStatus),
    __metadata("design:type", String)
], ListTechniciansQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListTechniciansQueryDto.prototype, "specialisation", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Exact skill match (Technician.skills is a scalar list — no substring search)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListTechniciansQueryDto.prototype, "skill", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['available', 'busy'], description: 'Restricts to ACTIVE technicians with zero (available) or at least one (busy) open job card — see deriveTechnicianAvailability' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['available', 'busy']),
    __metadata("design:type", String)
], ListTechniciansQueryDto.prototype, "workload", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ListTechniciansQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 20 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], ListTechniciansQueryDto.prototype, "pageSize", void 0);
//# sourceMappingURL=list-technicians-query.dto.js.map