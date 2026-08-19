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
exports.EstimatesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const estimates_service_1 = require("./estimates.service");
const create_estimate_dto_1 = require("./dto/create-estimate.dto");
const update_estimate_dto_1 = require("./dto/update-estimate.dto");
const list_estimates_query_dto_1 = require("./dto/list-estimates-query.dto");
const create_estimate_line_item_dto_1 = require("./dto/create-estimate-line-item.dto");
const update_estimate_line_item_dto_1 = require("./dto/update-estimate-line-item.dto");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const audit_log_interceptor_1 = require("../../common/interceptors/audit-log.interceptor");
let EstimatesController = class EstimatesController {
    constructor(estimatesService) {
        this.estimatesService = estimatesService;
    }
    create(dto) {
        return this.estimatesService.create(dto);
    }
    findAll(query) {
        return this.estimatesService.findAll(query);
    }
    findOne(id) {
        return this.estimatesService.findOne(id);
    }
    update(id, dto) {
        return this.estimatesService.update(id, dto);
    }
    remove(id) {
        return this.estimatesService.remove(id);
    }
    addLineItem(id, dto) {
        return this.estimatesService.addLineItem(id, dto);
    }
    updateLineItem(id, itemId, dto) {
        return this.estimatesService.updateLineItem(id, itemId, dto);
    }
    removeLineItem(id, itemId) {
        return this.estimatesService.removeLineItem(id, itemId);
    }
    send(id) {
        return this.estimatesService.send(id);
    }
    approve(id) {
        return this.estimatesService.approve(id);
    }
    reject(id) {
        return this.estimatesService.reject(id);
    }
    convertToJobCard(id) {
        return this.estimatesService.convertToJobCard(id);
    }
};
exports.EstimatesController = EstimatesController;
__decorate([
    (0, permissions_decorator_1.Permissions)('estimate:create'),
    (0, common_1.Post)(),
    (0, audit_log_interceptor_1.Audit)('estimate.create', 'Estimate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_estimate_dto_1.CreateEstimateDto]),
    __metadata("design:returntype", void 0)
], EstimatesController.prototype, "create", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('estimate:read'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_estimates_query_dto_1.ListEstimatesQueryDto]),
    __metadata("design:returntype", void 0)
], EstimatesController.prototype, "findAll", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('estimate:read'),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EstimatesController.prototype, "findOne", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('estimate:update'),
    (0, common_1.Patch)(':id'),
    (0, audit_log_interceptor_1.Audit)('estimate.update', 'Estimate'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_estimate_dto_1.UpdateEstimateDto]),
    __metadata("design:returntype", void 0)
], EstimatesController.prototype, "update", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('estimate:delete'),
    (0, common_1.Delete)(':id'),
    (0, audit_log_interceptor_1.Audit)('estimate.delete', 'Estimate'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EstimatesController.prototype, "remove", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('estimate:update'),
    (0, common_1.Post)(':id/line-items'),
    (0, audit_log_interceptor_1.Audit)('estimate.line-item.add', 'EstimateLineItem'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_estimate_line_item_dto_1.CreateEstimateLineItemDto]),
    __metadata("design:returntype", void 0)
], EstimatesController.prototype, "addLineItem", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('estimate:update'),
    (0, common_1.Patch)(':id/line-items/:itemId'),
    (0, audit_log_interceptor_1.Audit)('estimate.line-item.update', 'EstimateLineItem'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('itemId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_estimate_line_item_dto_1.UpdateEstimateLineItemDto]),
    __metadata("design:returntype", void 0)
], EstimatesController.prototype, "updateLineItem", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('estimate:update'),
    (0, common_1.Delete)(':id/line-items/:itemId'),
    (0, audit_log_interceptor_1.Audit)('estimate.line-item.remove', 'EstimateLineItem'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('itemId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], EstimatesController.prototype, "removeLineItem", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('estimate:update'),
    (0, common_1.Post)(':id/send'),
    (0, audit_log_interceptor_1.Audit)('estimate.send', 'Estimate'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EstimatesController.prototype, "send", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('estimate:update'),
    (0, common_1.Post)(':id/approve'),
    (0, audit_log_interceptor_1.Audit)('estimate.approve', 'Estimate'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EstimatesController.prototype, "approve", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('estimate:update'),
    (0, common_1.Post)(':id/reject'),
    (0, audit_log_interceptor_1.Audit)('estimate.reject', 'Estimate'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EstimatesController.prototype, "reject", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('estimate:update'),
    (0, common_1.Post)(':id/convert-to-job-card'),
    (0, audit_log_interceptor_1.Audit)('estimate.convert-to-job-card', 'Estimate'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EstimatesController.prototype, "convertToJobCard", null);
exports.EstimatesController = EstimatesController = __decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('estimates'),
    (0, common_1.Controller)('estimates'),
    __metadata("design:paramtypes", [estimates_service_1.EstimatesService])
], EstimatesController);
//# sourceMappingURL=estimates.controller.js.map