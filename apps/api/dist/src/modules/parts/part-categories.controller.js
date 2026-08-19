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
exports.PartCategoriesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const part_categories_service_1 = require("./part-categories.service");
const create_part_category_dto_1 = require("./dto/create-part-category.dto");
const update_part_category_dto_1 = require("./dto/update-part-category.dto");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const audit_log_interceptor_1 = require("../../common/interceptors/audit-log.interceptor");
let PartCategoriesController = class PartCategoriesController {
    constructor(partCategoriesService) {
        this.partCategoriesService = partCategoriesService;
    }
    create(dto) {
        return this.partCategoriesService.create(dto);
    }
    findAll() {
        return this.partCategoriesService.findAll();
    }
    update(id, dto) {
        return this.partCategoriesService.update(id, dto);
    }
    remove(id) {
        return this.partCategoriesService.remove(id);
    }
};
exports.PartCategoriesController = PartCategoriesController;
__decorate([
    (0, permissions_decorator_1.Permissions)('part:create'),
    (0, common_1.Post)(),
    (0, audit_log_interceptor_1.Audit)('part-category.create', 'PartCategory'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_part_category_dto_1.CreatePartCategoryDto]),
    __metadata("design:returntype", void 0)
], PartCategoriesController.prototype, "create", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('part:read'),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PartCategoriesController.prototype, "findAll", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('part:update'),
    (0, common_1.Patch)(':id'),
    (0, audit_log_interceptor_1.Audit)('part-category.update', 'PartCategory'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_part_category_dto_1.UpdatePartCategoryDto]),
    __metadata("design:returntype", void 0)
], PartCategoriesController.prototype, "update", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('part:delete'),
    (0, common_1.Delete)(':id'),
    (0, audit_log_interceptor_1.Audit)('part-category.delete', 'PartCategory'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PartCategoriesController.prototype, "remove", null);
exports.PartCategoriesController = PartCategoriesController = __decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('part-categories'),
    (0, common_1.Controller)('part-categories'),
    __metadata("design:paramtypes", [part_categories_service_1.PartCategoriesService])
], PartCategoriesController);
//# sourceMappingURL=part-categories.controller.js.map