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
exports.SmsProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const twilio_1 = __importDefault(require("twilio"));
let SmsProvider = class SmsProvider {
    constructor(config) {
        this.config = config;
        const accountSid = this.config.get('messaging.twilio.accountSid');
        const authToken = this.config.get('messaging.twilio.authToken');
        this.fromNumber = this.config.get('messaging.twilio.fromNumber');
        this.client = accountSid && authToken && this.fromNumber ? (0, twilio_1.default)(accountSid, authToken) : null;
    }
    isConfigured() {
        return this.client !== null;
    }
    async send(to, body) {
        if (!this.client || !this.fromNumber)
            return { ok: false, error: 'Twilio not configured' };
        try {
            await this.client.messages.create({ to, from: this.fromNumber, body });
            return { ok: true };
        }
        catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown SMS error' };
        }
    }
};
exports.SmsProvider = SmsProvider;
exports.SmsProvider = SmsProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SmsProvider);
//# sourceMappingURL=sms.provider.js.map