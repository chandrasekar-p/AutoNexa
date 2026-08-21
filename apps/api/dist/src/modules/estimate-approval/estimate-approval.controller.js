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
exports.EstimateApprovalController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const estimate_approval_service_1 = require("./estimate-approval.service");
let EstimateApprovalController = class EstimateApprovalController {
    constructor(estimateApproval) {
        this.estimateApproval = estimateApproval;
    }
    getSummary(token, req) {
        return this.estimateApproval.getSummary(token, { ip: req.ip, userAgent: req.headers['user-agent'] });
    }
    approve(token, req) {
        return this.decide(token, 'APPROVED', req);
    }
    reject(token, req) {
        return this.decide(token, 'REJECTED', req);
    }
    decide(token, decision, req) {
        return this.estimateApproval.decide(token, decision, { ip: req.ip, userAgent: req.headers['user-agent'] });
    }
};
exports.EstimateApprovalController = EstimateApprovalController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60_000 } }),
    (0, common_1.Get)(':token'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], EstimateApprovalController.prototype, "getSummary", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60_000 } }),
    (0, common_1.Post)(':token/approve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], EstimateApprovalController.prototype, "approve", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60_000 } }),
    (0, common_1.Post)(':token/reject'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], EstimateApprovalController.prototype, "reject", null);
exports.EstimateApprovalController = EstimateApprovalController = __decorate([
    (0, swagger_1.ApiTags)('estimate-approval'),
    (0, common_1.Controller)('estimates/approve'),
    __metadata("design:paramtypes", [estimate_approval_service_1.EstimateApprovalService])
], EstimateApprovalController);
//# sourceMappingURL=estimate-approval.controller.js.map