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
exports.PartsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const parts_service_1 = require("./parts.service");
const create_part_dto_1 = require("./dto/create-part.dto");
const update_part_dto_1 = require("./dto/update-part.dto");
const list_parts_query_dto_1 = require("./dto/list-parts-query.dto");
const stock_ledger_query_dto_1 = require("./dto/stock-ledger-query.dto");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const audit_log_interceptor_1 = require("../../common/interceptors/audit-log.interceptor");
let PartsController = class PartsController {
    constructor(partsService) {
        this.partsService = partsService;
    }
    create(dto) {
        return this.partsService.create(dto);
    }
    findAll(query) {
        return this.partsService.findAll(query);
    }
    findOne(id) {
        return this.partsService.findOne(id);
    }
    getStockLedger(id, query) {
        return this.partsService.getStockLedger(id, query);
    }
    update(id, dto) {
        return this.partsService.update(id, dto);
    }
    remove(id) {
        return this.partsService.remove(id);
    }
};
exports.PartsController = PartsController;
__decorate([
    (0, permissions_decorator_1.Permissions)('part:create'),
    (0, common_1.Post)(),
    (0, audit_log_interceptor_1.Audit)('part.create', 'Part'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_part_dto_1.CreatePartDto]),
    __metadata("design:returntype", void 0)
], PartsController.prototype, "create", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('part:read'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_parts_query_dto_1.ListPartsQueryDto]),
    __metadata("design:returntype", void 0)
], PartsController.prototype, "findAll", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('part:read'),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PartsController.prototype, "findOne", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('inventory:read'),
    (0, common_1.Get)(':id/stock-ledger'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, stock_ledger_query_dto_1.StockLedgerQueryDto]),
    __metadata("design:returntype", void 0)
], PartsController.prototype, "getStockLedger", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('part:update'),
    (0, common_1.Patch)(':id'),
    (0, audit_log_interceptor_1.Audit)('part.update', 'Part'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_part_dto_1.UpdatePartDto]),
    __metadata("design:returntype", void 0)
], PartsController.prototype, "update", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('part:delete'),
    (0, common_1.Delete)(':id'),
    (0, audit_log_interceptor_1.Audit)('part.delete', 'Part'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PartsController.prototype, "remove", null);
exports.PartsController = PartsController = __decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('parts'),
    (0, common_1.Controller)('parts'),
    __metadata("design:paramtypes", [parts_service_1.PartsService])
], PartsController);
//# sourceMappingURL=parts.controller.js.map