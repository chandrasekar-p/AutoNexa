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
exports.SupplierPaymentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const supplier_payments_service_1 = require("./supplier-payments.service");
const create_supplier_payment_dto_1 = require("./dto/create-supplier-payment.dto");
const list_supplier_payments_query_dto_1 = require("./dto/list-supplier-payments-query.dto");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const audit_log_interceptor_1 = require("../../common/interceptors/audit-log.interceptor");
let SupplierPaymentsController = class SupplierPaymentsController {
    constructor(supplierPaymentsService) {
        this.supplierPaymentsService = supplierPaymentsService;
    }
    create(dto) {
        return this.supplierPaymentsService.create(dto);
    }
    findAll(query) {
        return this.supplierPaymentsService.findAll(query);
    }
    findOne(id) {
        return this.supplierPaymentsService.findOne(id);
    }
};
exports.SupplierPaymentsController = SupplierPaymentsController;
__decorate([
    (0, permissions_decorator_1.Permissions)('purchase:create'),
    (0, common_1.Post)(),
    (0, audit_log_interceptor_1.Audit)('supplier-payment.create', 'SupplierPayment'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_supplier_payment_dto_1.CreateSupplierPaymentDto]),
    __metadata("design:returntype", void 0)
], SupplierPaymentsController.prototype, "create", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('purchase:read'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_supplier_payments_query_dto_1.ListSupplierPaymentsQueryDto]),
    __metadata("design:returntype", void 0)
], SupplierPaymentsController.prototype, "findAll", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('purchase:read'),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SupplierPaymentsController.prototype, "findOne", null);
exports.SupplierPaymentsController = SupplierPaymentsController = __decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('supplier-payments'),
    (0, common_1.Controller)('supplier-payments'),
    __metadata("design:paramtypes", [supplier_payments_service_1.SupplierPaymentsService])
], SupplierPaymentsController);
//# sourceMappingURL=supplier-payments.controller.js.map