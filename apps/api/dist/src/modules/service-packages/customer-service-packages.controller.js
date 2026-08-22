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
exports.CustomerServicePackagesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const customer_service_packages_service_1 = require("./customer-service-packages.service");
const sell_service_package_dto_1 = require("./dto/sell-service-package.dto");
const list_customer_service_packages_query_dto_1 = require("./dto/list-customer-service-packages-query.dto");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const audit_log_interceptor_1 = require("../../common/interceptors/audit-log.interceptor");
let CustomerServicePackagesController = class CustomerServicePackagesController {
    constructor(customerServicePackagesService) {
        this.customerServicePackagesService = customerServicePackagesService;
    }
    sell(dto) {
        return this.customerServicePackagesService.sell(dto);
    }
    findAll(query) {
        return this.customerServicePackagesService.findAll(query);
    }
    findOne(id) {
        return this.customerServicePackagesService.findOne(id);
    }
    renew(id) {
        return this.customerServicePackagesService.renew(id);
    }
    cancel(id) {
        return this.customerServicePackagesService.cancel(id);
    }
};
exports.CustomerServicePackagesController = CustomerServicePackagesController;
__decorate([
    (0, permissions_decorator_1.Permissions)('service-package:create'),
    (0, common_1.Post)(),
    (0, audit_log_interceptor_1.Audit)('customer-service-package.sell', 'CustomerServicePackage'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [sell_service_package_dto_1.SellServicePackageDto]),
    __metadata("design:returntype", void 0)
], CustomerServicePackagesController.prototype, "sell", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('service-package:read'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_customer_service_packages_query_dto_1.ListCustomerServicePackagesQueryDto]),
    __metadata("design:returntype", void 0)
], CustomerServicePackagesController.prototype, "findAll", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('service-package:read'),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CustomerServicePackagesController.prototype, "findOne", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('service-package:create'),
    (0, common_1.Post)(':id/renew'),
    (0, audit_log_interceptor_1.Audit)('customer-service-package.renew', 'CustomerServicePackage'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CustomerServicePackagesController.prototype, "renew", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('service-package:update'),
    (0, common_1.Patch)(':id/cancel'),
    (0, audit_log_interceptor_1.Audit)('customer-service-package.cancel', 'CustomerServicePackage'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CustomerServicePackagesController.prototype, "cancel", null);
exports.CustomerServicePackagesController = CustomerServicePackagesController = __decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('customer-service-packages'),
    (0, common_1.Controller)('customer-service-packages'),
    __metadata("design:paramtypes", [customer_service_packages_service_1.CustomerServicePackagesService])
], CustomerServicePackagesController);
//# sourceMappingURL=customer-service-packages.controller.js.map