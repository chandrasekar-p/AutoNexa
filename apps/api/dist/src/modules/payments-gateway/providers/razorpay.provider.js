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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RazorpayProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const razorpay_1 = __importDefault(require("razorpay"));
let RazorpayProvider = class RazorpayProvider {
    constructor(config) {
        this.config = config;
        const keyId = this.config.get('razorpay.keyId');
        const keySecret = this.config.get('razorpay.keySecret');
        this.client = keyId && keySecret ? new razorpay_1.default({ key_id: keyId, key_secret: keySecret }) : null;
    }
    isConfigured() {
        return this.client !== null;
    }
    getWebhookSecret() {
        return this.config.get('razorpay.webhookSecret');
    }
    async createPaymentLink(params) {
        if (!this.client)
            throw new Error('Razorpay is not configured');
        const link = await this.client.paymentLink.create({
            amount: Math.round(params.amount * 100),
            currency: 'INR',
            accept_partial: false,
            description: params.description,
            reference_id: params.referenceId,
            customer: {
                name: params.customerName,
                email: params.customerEmail ?? undefined,
                contact: params.customerMobile,
            },
            notify: { sms: false, email: false },
            ...(params.callbackUrl ? { callback_url: params.callbackUrl, callback_method: 'get' } : {}),
            notes: params.notes,
        });
        return {
            providerOrderId: link.id,
            shortUrl: link.short_url,
            expiresAt: link.expire_by ? new Date(link.expire_by * 1000) : null,
        };
    }
};
exports.RazorpayProvider = RazorpayProvider;
exports.RazorpayProvider = RazorpayProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RazorpayProvider);
//# sourceMappingURL=razorpay.provider.js.map