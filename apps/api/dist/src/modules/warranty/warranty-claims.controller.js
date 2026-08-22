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
exports.WarrantyClaimsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const warranty_claims_service_1 = require("./warranty-claims.service");
const create_warranty_claim_dto_1 = require("./dto/create-warranty-claim.dto");
const update_warranty_claim_dto_1 = require("./dto/update-warranty-claim.dto");
const list_warranty_claims_query_dto_1 = require("./dto/list-warranty-claims-query.dto");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const audit_log_interceptor_1 = require("../../common/interceptors/audit-log.interceptor");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let WarrantyClaimsController = class WarrantyClaimsController {
    constructor(warrantyClaimsService) {
        this.warrantyClaimsService = warrantyClaimsService;
    }
    create(dto) {
        return this.warrantyClaimsService.create(dto);
    }
    findAll(query) {
        return this.warrantyClaimsService.findAll(query);
    }
    findOne(id) {
        return this.warrantyClaimsService.findOne(id);
    }
    update(id, dto, user) {
        return this.warrantyClaimsService.update(id, dto, user.userId);
    }
};
exports.WarrantyClaimsController = WarrantyClaimsController;
__decorate([
    (0, permissions_decorator_1.Permissions)('warranty-claim:create'),
    (0, common_1.Post)(),
    (0, audit_log_interceptor_1.Audit)('warranty-claim.create', 'WarrantyClaim'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_warranty_claim_dto_1.CreateWarrantyClaimDto]),
    __metadata("design:returntype", void 0)
], WarrantyClaimsController.prototype, "create", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('warranty-claim:read'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_warranty_claims_query_dto_1.ListWarrantyClaimsQueryDto]),
    __metadata("design:returntype", void 0)
], WarrantyClaimsController.prototype, "findAll", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('warranty-claim:read'),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WarrantyClaimsController.prototype, "findOne", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('warranty-claim:update'),
    (0, common_1.Patch)(':id'),
    (0, audit_log_interceptor_1.Audit)('warranty-claim.update', 'WarrantyClaim'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_warranty_claim_dto_1.UpdateWarrantyClaimDto, Object]),
    __metadata("design:returntype", void 0)
], WarrantyClaimsController.prototype, "update", null);
exports.WarrantyClaimsController = WarrantyClaimsController = __decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('warranty-claims'),
    (0, common_1.Controller)('warranty-claims'),
    __metadata("design:paramtypes", [warranty_claims_service_1.WarrantyClaimsService])
], WarrantyClaimsController);
//# sourceMappingURL=warranty-claims.controller.js.map