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
exports.PurchaseInvoicesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const purchase_invoices_service_1 = require("./purchase-invoices.service");
const create_purchase_invoice_dto_1 = require("./dto/create-purchase-invoice.dto");
const update_purchase_invoice_dto_1 = require("./dto/update-purchase-invoice.dto");
const list_purchase_invoices_query_dto_1 = require("./dto/list-purchase-invoices-query.dto");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const audit_log_interceptor_1 = require("../../common/interceptors/audit-log.interceptor");
let PurchaseInvoicesController = class PurchaseInvoicesController {
    constructor(purchaseInvoicesService) {
        this.purchaseInvoicesService = purchaseInvoicesService;
    }
    create(dto) {
        return this.purchaseInvoicesService.create(dto);
    }
    findAll(query) {
        return this.purchaseInvoicesService.findAll(query);
    }
    findOne(id) {
        return this.purchaseInvoicesService.findOne(id);
    }
    update(id, dto) {
        return this.purchaseInvoicesService.update(id, dto);
    }
};
exports.PurchaseInvoicesController = PurchaseInvoicesController;
__decorate([
    (0, permissions_decorator_1.Permissions)('purchase:create'),
    (0, common_1.Post)(),
    (0, audit_log_interceptor_1.Audit)('purchase-invoice.create', 'PurchaseInvoice'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_purchase_invoice_dto_1.CreatePurchaseInvoiceDto]),
    __metadata("design:returntype", void 0)
], PurchaseInvoicesController.prototype, "create", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('purchase:read'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_purchase_invoices_query_dto_1.ListPurchaseInvoicesQueryDto]),
    __metadata("design:returntype", void 0)
], PurchaseInvoicesController.prototype, "findAll", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('purchase:read'),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PurchaseInvoicesController.prototype, "findOne", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('purchase:update'),
    (0, common_1.Patch)(':id'),
    (0, audit_log_interceptor_1.Audit)('purchase-invoice.update', 'PurchaseInvoice'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_purchase_invoice_dto_1.UpdatePurchaseInvoiceDto]),
    __metadata("design:returntype", void 0)
], PurchaseInvoicesController.prototype, "update", null);
exports.PurchaseInvoicesController = PurchaseInvoicesController = __decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('purchase-invoices'),
    (0, common_1.Controller)('purchase-invoices'),
    __metadata("design:paramtypes", [purchase_invoices_service_1.PurchaseInvoicesService])
], PurchaseInvoicesController);
//# sourceMappingURL=purchase-invoices.controller.js.map