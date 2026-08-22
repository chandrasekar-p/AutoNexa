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
exports.ServicePackagesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const service_packages_service_1 = require("./service-packages.service");
const create_service_package_dto_1 = require("./dto/create-service-package.dto");
const update_service_package_dto_1 = require("./dto/update-service-package.dto");
const list_service_packages_query_dto_1 = require("./dto/list-service-packages-query.dto");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const audit_log_interceptor_1 = require("../../common/interceptors/audit-log.interceptor");
let ServicePackagesController = class ServicePackagesController {
    constructor(servicePackagesService) {
        this.servicePackagesService = servicePackagesService;
    }
    create(dto) {
        return this.servicePackagesService.create(dto);
    }
    findAll(query) {
        return this.servicePackagesService.findAll(query);
    }
    findOne(id) {
        return this.servicePackagesService.findOne(id);
    }
    update(id, dto) {
        return this.servicePackagesService.update(id, dto);
    }
    remove(id) {
        return this.servicePackagesService.remove(id);
    }
};
exports.ServicePackagesController = ServicePackagesController;
__decorate([
    (0, permissions_decorator_1.Permissions)('service-package:create'),
    (0, common_1.Post)(),
    (0, audit_log_interceptor_1.Audit)('service-package.create', 'ServicePackage'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_service_package_dto_1.CreateServicePackageDto]),
    __metadata("design:returntype", void 0)
], ServicePackagesController.prototype, "create", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('service-package:read'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_service_packages_query_dto_1.ListServicePackagesQueryDto]),
    __metadata("design:returntype", void 0)
], ServicePackagesController.prototype, "findAll", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('service-package:read'),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ServicePackagesController.prototype, "findOne", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('service-package:update'),
    (0, common_1.Patch)(':id'),
    (0, audit_log_interceptor_1.Audit)('service-package.update', 'ServicePackage'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_service_package_dto_1.UpdateServicePackageDto]),
    __metadata("design:returntype", void 0)
], ServicePackagesController.prototype, "update", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('service-package:delete'),
    (0, common_1.Delete)(':id'),
    (0, audit_log_interceptor_1.Audit)('service-package.delete', 'ServicePackage'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ServicePackagesController.prototype, "remove", null);
exports.ServicePackagesController = ServicePackagesController = __decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('service-packages'),
    (0, common_1.Controller)('service-packages'),
    __metadata("design:paramtypes", [service_packages_service_1.ServicePackagesService])
], ServicePackagesController);
//# sourceMappingURL=service-packages.controller.js.map