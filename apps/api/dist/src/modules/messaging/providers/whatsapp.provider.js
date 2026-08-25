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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mobile_1 = require("../../../common/validators/mobile");
let WhatsAppProvider = class WhatsAppProvider {
    constructor(config) {
        this.config = config;
        this.accessToken = this.config.get('messaging.whatsapp.accessToken');
        this.phoneNumberId = this.config.get('messaging.whatsapp.phoneNumberId');
    }
    isConfigured() {
        return Boolean(this.accessToken && this.phoneNumberId);
    }
    async send(to, body) {
        if (!this.accessToken || !this.phoneNumberId)
            return { ok: false, error: 'WhatsApp Cloud API not configured' };
        try {
            const res = await fetch(`https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: (0, mobile_1.toE164)(to),
                    type: 'text',
                    text: { body },
                }),
            });
            if (!res.ok) {
                const errorBody = await res.text();
                return { ok: false, error: `WhatsApp API ${res.status}: ${errorBody}` };
            }
            return { ok: true };
        }
        catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : 'Unknown WhatsApp error' };
        }
    }
};
exports.WhatsAppProvider = WhatsAppProvider;
exports.WhatsAppProvider = WhatsAppProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], WhatsAppProvider);
//# sourceMappingURL=whatsapp.provider.js.map