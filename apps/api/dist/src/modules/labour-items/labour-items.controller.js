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
exports.LabourItemsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const labour_items_service_1 = require("./labour-items.service");
const create_labour_item_dto_1 = require("./dto/create-labour-item.dto");
const update_labour_item_dto_1 = require("./dto/update-labour-item.dto");
const list_labour_items_query_dto_1 = require("./dto/list-labour-items-query.dto");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const audit_log_interceptor_1 = require("../../common/interceptors/audit-log.interceptor");
let LabourItemsController = class LabourItemsController {
    constructor(labourItemsService) {
        this.labourItemsService = labourItemsService;
    }
    create(dto) {
        return this.labourItemsService.create(dto);
    }
    findAll(query) {
        return this.labourItemsService.findAll(query);
    }
    findOne(id) {
        return this.labourItemsService.findOne(id);
    }
    update(id, dto) {
        return this.labourItemsService.update(id, dto);
    }
    remove(id) {
        return this.labourItemsService.remove(id);
    }
};
exports.LabourItemsController = LabourItemsController;
__decorate([
    (0, permissions_decorator_1.Permissions)('labour:create'),
    (0, common_1.Post)(),
    (0, audit_log_interceptor_1.Audit)('labour-item.create', 'LabourItem'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_labour_item_dto_1.CreateLabourItemDto]),
    __metadata("design:returntype", void 0)
], LabourItemsController.prototype, "create", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('labour:read'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_labour_items_query_dto_1.ListLabourItemsQueryDto]),
    __metadata("design:returntype", void 0)
], LabourItemsController.prototype, "findAll", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('labour:read'),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LabourItemsController.prototype, "findOne", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('labour:update'),
    (0, common_1.Patch)(':id'),
    (0, audit_log_interceptor_1.Audit)('labour-item.update', 'LabourItem'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_labour_item_dto_1.UpdateLabourItemDto]),
    __metadata("design:returntype", void 0)
], LabourItemsController.prototype, "update", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('labour:delete'),
    (0, common_1.Delete)(':id'),
    (0, audit_log_interceptor_1.Audit)('labour-item.delete', 'LabourItem'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LabourItemsController.prototype, "remove", null);
exports.LabourItemsController = LabourItemsController = __decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('labour-items'),
    (0, common_1.Controller)('labour-items'),
    __metadata("design:paramtypes", [labour_items_service_1.LabourItemsService])
], LabourItemsController);
//# sourceMappingURL=labour-items.controller.js.map