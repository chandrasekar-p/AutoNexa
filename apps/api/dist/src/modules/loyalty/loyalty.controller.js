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
exports.LoyaltyController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const loyalty_service_1 = require("./loyalty.service");
const adjust_loyalty_points_dto_1 = require("./dto/adjust-loyalty-points.dto");
const list_loyalty_transactions_query_dto_1 = require("./dto/list-loyalty-transactions-query.dto");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const audit_log_interceptor_1 = require("../../common/interceptors/audit-log.interceptor");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let LoyaltyController = class LoyaltyController {
    constructor(loyaltyService) {
        this.loyaltyService = loyaltyService;
    }
    getBalance(customerId) {
        return this.loyaltyService.getBalance(customerId);
    }
    listTransactions(query) {
        return this.loyaltyService.listTransactions(query);
    }
    adjust(dto, user) {
        return this.loyaltyService.adjust(dto, user.userId);
    }
};
exports.LoyaltyController = LoyaltyController;
__decorate([
    (0, permissions_decorator_1.Permissions)('loyalty:read'),
    (0, common_1.Get)('customers/:customerId/balance'),
    __param(0, (0, common_1.Param)('customerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "getBalance", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('loyalty:read'),
    (0, common_1.Get)('transactions'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_loyalty_transactions_query_dto_1.ListLoyaltyTransactionsQueryDto]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "listTransactions", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('loyalty:update'),
    (0, common_1.Post)('adjust'),
    (0, audit_log_interceptor_1.Audit)('loyalty.adjust', 'LoyaltyTransaction'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [adjust_loyalty_points_dto_1.AdjustLoyaltyPointsDto, Object]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "adjust", null);
exports.LoyaltyController = LoyaltyController = __decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('loyalty'),
    (0, common_1.Controller)('loyalty'),
    __metadata("design:paramtypes", [loyalty_service_1.LoyaltyService])
], LoyaltyController);
//# sourceMappingURL=loyalty.controller.js.map