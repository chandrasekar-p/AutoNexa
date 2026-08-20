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
exports.InspectionsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const inspections_service_1 = require("./inspections.service");
const create_inspection_dto_1 = require("./dto/create-inspection.dto");
const update_inspection_dto_1 = require("./dto/update-inspection.dto");
const list_inspections_query_dto_1 = require("./dto/list-inspections-query.dto");
const create_inspection_item_dto_1 = require("./dto/create-inspection-item.dto");
const update_inspection_item_dto_1 = require("./dto/update-inspection-item.dto");
const add_inspection_photo_dto_1 = require("./dto/add-inspection-photo.dto");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const audit_log_interceptor_1 = require("../../common/interceptors/audit-log.interceptor");
let InspectionsController = class InspectionsController {
    constructor(inspectionsService) {
        this.inspectionsService = inspectionsService;
    }
    create(dto) {
        return this.inspectionsService.create(dto);
    }
    findAll(query) {
        return this.inspectionsService.findAll(query);
    }
    findOne(id) {
        return this.inspectionsService.findOne(id);
    }
    update(id, dto) {
        return this.inspectionsService.update(id, dto);
    }
    addItem(id, dto) {
        return this.inspectionsService.addItem(id, dto);
    }
    updateItem(id, itemId, dto) {
        return this.inspectionsService.updateItem(id, itemId, dto);
    }
    removeItem(id, itemId) {
        return this.inspectionsService.removeItem(id, itemId);
    }
    addPhoto(id, dto) {
        return this.inspectionsService.addPhoto(id, dto);
    }
};
exports.InspectionsController = InspectionsController;
__decorate([
    (0, permissions_decorator_1.Permissions)('inspection:create'),
    (0, common_1.Post)(),
    (0, audit_log_interceptor_1.Audit)('inspection.create', 'Inspection'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_inspection_dto_1.CreateInspectionDto]),
    __metadata("design:returntype", void 0)
], InspectionsController.prototype, "create", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('inspection:read'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_inspections_query_dto_1.ListInspectionsQueryDto]),
    __metadata("design:returntype", void 0)
], InspectionsController.prototype, "findAll", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('inspection:read'),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InspectionsController.prototype, "findOne", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('inspection:update'),
    (0, common_1.Patch)(':id'),
    (0, audit_log_interceptor_1.Audit)('inspection.update', 'Inspection'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_inspection_dto_1.UpdateInspectionDto]),
    __metadata("design:returntype", void 0)
], InspectionsController.prototype, "update", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('inspection:update'),
    (0, common_1.Post)(':id/items'),
    (0, audit_log_interceptor_1.Audit)('inspection.item.add', 'InspectionItem'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_inspection_item_dto_1.CreateInspectionItemDto]),
    __metadata("design:returntype", void 0)
], InspectionsController.prototype, "addItem", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('inspection:update'),
    (0, common_1.Patch)(':id/items/:itemId'),
    (0, audit_log_interceptor_1.Audit)('inspection.item.update', 'InspectionItem'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('itemId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_inspection_item_dto_1.UpdateInspectionItemDto]),
    __metadata("design:returntype", void 0)
], InspectionsController.prototype, "updateItem", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('inspection:update'),
    (0, common_1.Delete)(':id/items/:itemId'),
    (0, audit_log_interceptor_1.Audit)('inspection.item.remove', 'InspectionItem'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('itemId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], InspectionsController.prototype, "removeItem", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('inspection:update'),
    (0, common_1.Post)(':id/photos'),
    (0, audit_log_interceptor_1.Audit)('inspection.photo.add', 'InspectionPhoto'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, add_inspection_photo_dto_1.AddInspectionPhotoDto]),
    __metadata("design:returntype", void 0)
], InspectionsController.prototype, "addPhoto", null);
exports.InspectionsController = InspectionsController = __decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('inspections'),
    (0, common_1.Controller)('inspections'),
    __metadata("design:paramtypes", [inspections_service_1.InspectionsService])
], InspectionsController);
//# sourceMappingURL=inspections.controller.js.map