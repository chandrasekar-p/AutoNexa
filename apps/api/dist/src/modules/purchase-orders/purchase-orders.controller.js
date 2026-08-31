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
exports.PurchaseOrdersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const purchase_orders_service_1 = require("./purchase-orders.service");
const create_purchase_order_dto_1 = require("./dto/create-purchase-order.dto");
const update_purchase_order_dto_1 = require("./dto/update-purchase-order.dto");
const list_purchase_orders_query_dto_1 = require("./dto/list-purchase-orders-query.dto");
const receive_goods_dto_1 = require("./dto/receive-goods.dto");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const audit_log_interceptor_1 = require("../../common/interceptors/audit-log.interceptor");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let PurchaseOrdersController = class PurchaseOrdersController {
    constructor(purchaseOrdersService) {
        this.purchaseOrdersService = purchaseOrdersService;
    }
    create(dto) {
        return this.purchaseOrdersService.create(dto);
    }
    findAll(query) {
        return this.purchaseOrdersService.findAll(query);
    }
    summary() {
        return this.purchaseOrdersService.summary();
    }
    findOne(id) {
        return this.purchaseOrdersService.findOne(id);
    }
    update(id, dto) {
        return this.purchaseOrdersService.update(id, dto);
    }
    receive(id, dto, user) {
        return this.purchaseOrdersService.receive(id, dto, user.userId);
    }
};
exports.PurchaseOrdersController = PurchaseOrdersController;
__decorate([
    (0, permissions_decorator_1.Permissions)('purchase:create'),
    (0, common_1.Post)(),
    (0, audit_log_interceptor_1.Audit)('purchase-order.create', 'PurchaseOrder'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_purchase_order_dto_1.CreatePurchaseOrderDto]),
    __metadata("design:returntype", void 0)
], PurchaseOrdersController.prototype, "create", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('purchase:read'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_purchase_orders_query_dto_1.ListPurchaseOrdersQueryDto]),
    __metadata("design:returntype", void 0)
], PurchaseOrdersController.prototype, "findAll", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('purchase:read'),
    (0, common_1.Get)('summary'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PurchaseOrdersController.prototype, "summary", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('purchase:read'),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PurchaseOrdersController.prototype, "findOne", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('purchase:update'),
    (0, common_1.Patch)(':id'),
    (0, audit_log_interceptor_1.Audit)('purchase-order.update', 'PurchaseOrder'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_purchase_order_dto_1.UpdatePurchaseOrderDto]),
    __metadata("design:returntype", void 0)
], PurchaseOrdersController.prototype, "update", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('purchase:update'),
    (0, common_1.Post)(':id/receive'),
    (0, audit_log_interceptor_1.Audit)('purchase-order.receive', 'PurchaseOrder'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, receive_goods_dto_1.ReceiveGoodsDto, Object]),
    __metadata("design:returntype", void 0)
], PurchaseOrdersController.prototype, "receive", null);
exports.PurchaseOrdersController = PurchaseOrdersController = __decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('purchase-orders'),
    (0, common_1.Controller)('purchase-orders'),
    __metadata("design:paramtypes", [purchase_orders_service_1.PurchaseOrdersService])
], PurchaseOrdersController);
//# sourceMappingURL=purchase-orders.controller.js.map