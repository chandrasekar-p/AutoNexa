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
exports.VehiclesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const vehicles_service_1 = require("./vehicles.service");
const create_vehicle_dto_1 = require("./dto/create-vehicle.dto");
const update_vehicle_dto_1 = require("./dto/update-vehicle.dto");
const list_vehicles_query_dto_1 = require("./dto/list-vehicles-query.dto");
const add_vehicle_document_dto_1 = require("./dto/add-vehicle-document.dto");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const audit_log_interceptor_1 = require("../../common/interceptors/audit-log.interceptor");
let VehiclesController = class VehiclesController {
    constructor(vehiclesService) {
        this.vehiclesService = vehiclesService;
    }
    create(dto) {
        return this.vehiclesService.create(dto);
    }
    findAll(query) {
        return this.vehiclesService.findAll(query);
    }
    findOne(id) {
        return this.vehiclesService.findOne(id);
    }
    getServiceHistory(id) {
        return this.vehiclesService.getServiceHistory(id);
    }
    getWarrantyStatus(id) {
        return this.vehiclesService.getWarrantyStatus(id);
    }
    update(id, dto) {
        return this.vehiclesService.update(id, dto);
    }
    remove(id) {
        return this.vehiclesService.remove(id);
    }
    addDocument(id, dto) {
        return this.vehiclesService.addDocument(id, dto);
    }
};
exports.VehiclesController = VehiclesController;
__decorate([
    (0, permissions_decorator_1.Permissions)('vehicle:create'),
    (0, common_1.Post)(),
    (0, audit_log_interceptor_1.Audit)('vehicle.create', 'Vehicle'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_vehicle_dto_1.CreateVehicleDto]),
    __metadata("design:returntype", void 0)
], VehiclesController.prototype, "create", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('vehicle:read'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_vehicles_query_dto_1.ListVehiclesQueryDto]),
    __metadata("design:returntype", void 0)
], VehiclesController.prototype, "findAll", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('vehicle:read'),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VehiclesController.prototype, "findOne", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('vehicle:read'),
    (0, common_1.Get)(':id/service-history'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VehiclesController.prototype, "getServiceHistory", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('vehicle:read'),
    (0, common_1.Get)(':id/warranty-status'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VehiclesController.prototype, "getWarrantyStatus", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('vehicle:update'),
    (0, common_1.Patch)(':id'),
    (0, audit_log_interceptor_1.Audit)('vehicle.update', 'Vehicle'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_vehicle_dto_1.UpdateVehicleDto]),
    __metadata("design:returntype", void 0)
], VehiclesController.prototype, "update", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('vehicle:delete'),
    (0, common_1.Delete)(':id'),
    (0, audit_log_interceptor_1.Audit)('vehicle.delete', 'Vehicle'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VehiclesController.prototype, "remove", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('vehicle:update'),
    (0, common_1.Post)(':id/documents'),
    (0, audit_log_interceptor_1.Audit)('vehicle.document.add', 'VehicleDocument'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, add_vehicle_document_dto_1.AddVehicleDocumentDto]),
    __metadata("design:returntype", void 0)
], VehiclesController.prototype, "addDocument", null);
exports.VehiclesController = VehiclesController = __decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('vehicles'),
    (0, common_1.Controller)('vehicles'),
    __metadata("design:paramtypes", [vehicles_service_1.VehiclesService])
], VehiclesController);
//# sourceMappingURL=vehicles.controller.js.map