"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsGatewayModule = void 0;
const common_1 = require("@nestjs/common");
const invoices_module_1 = require("../invoices/invoices.module");
const messaging_module_1 = require("../messaging/messaging.module");
const payments_gateway_service_1 = require("./payments-gateway.service");
const razorpay_provider_1 = require("./providers/razorpay.provider");
const payment_link_controller_1 = require("./payment-link.controller");
const razorpay_webhook_controller_1 = require("./razorpay-webhook.controller");
let PaymentsGatewayModule = class PaymentsGatewayModule {
};
exports.PaymentsGatewayModule = PaymentsGatewayModule;
exports.PaymentsGatewayModule = PaymentsGatewayModule = __decorate([
    (0, common_1.Module)({
        imports: [invoices_module_1.InvoicesModule, messaging_module_1.MessagingModule],
        controllers: [payment_link_controller_1.PaymentLinkController, razorpay_webhook_controller_1.RazorpayWebhookController],
        providers: [payments_gateway_service_1.PaymentsGatewayService, razorpay_provider_1.RazorpayProvider],
    })
], PaymentsGatewayModule);
//# sourceMappingURL=payments-gateway.module.js.map