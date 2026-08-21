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
exports.RazorpayWebhookController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const payments_gateway_service_1 = require("./payments-gateway.service");
let RazorpayWebhookController = class RazorpayWebhookController {
    constructor(paymentsGateway) {
        this.paymentsGateway = paymentsGateway;
    }
    async handleRazorpayWebhook(req, signature, eventId) {
        const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
        await this.paymentsGateway.handleWebhook(rawBody, signature, eventId);
        return { status: 'ok' };
    }
};
exports.RazorpayWebhookController = RazorpayWebhookController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('razorpay'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('x-razorpay-signature')),
    __param(2, (0, common_1.Headers)('x-razorpay-event-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], RazorpayWebhookController.prototype, "handleRazorpayWebhook", null);
exports.RazorpayWebhookController = RazorpayWebhookController = __decorate([
    (0, swagger_1.ApiExcludeController)(),
    (0, common_1.Controller)('payments/webhooks'),
    __metadata("design:paramtypes", [payments_gateway_service_1.PaymentsGatewayService])
], RazorpayWebhookController);
//# sourceMappingURL=razorpay-webhook.controller.js.map