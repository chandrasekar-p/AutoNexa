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
exports.MessagingService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const email_provider_1 = require("./providers/email.provider");
const sms_provider_1 = require("./providers/sms.provider");
const whatsapp_provider_1 = require("./providers/whatsapp.provider");
const slack_provider_1 = require("./providers/slack.provider");
const pick_channels_1 = require("./pick-channels");
let MessagingService = class MessagingService {
    constructor(prisma, emailProvider, smsProvider, whatsappProvider, slackProvider) {
        this.prisma = prisma;
        this.emailProvider = emailProvider;
        this.smsProvider = smsProvider;
        this.whatsappProvider = whatsappProvider;
        this.slackProvider = slackProvider;
    }
    async notifyCustomer(tenantId, event, recipient, content, related, attachments, dedupeKey) {
        const availability = {
            email: this.emailProvider.isConfigured(),
            sms: this.smsProvider.isConfigured(),
            whatsapp: this.whatsappProvider.isConfigured(),
        };
        const settings = await this.prisma.platform.tenantSettings.findUnique({ where: { tenantId } });
        const preference = {
            email: settings?.notifyByEmail ?? true,
            sms: settings?.notifyBySms ?? true,
            whatsapp: settings?.notifyByWhatsapp ?? true,
        };
        const channels = (0, pick_channels_1.pickCustomerChannels)(recipient, availability, preference);
        if (channels.length === 0) {
            await this.log(tenantId, client_1.DeliveryChannel.EMAIL, event, recipient.email ?? recipient.mobile ?? 'unknown', client_1.DeliveryStatus.SKIPPED, 'No messaging provider configured', related, dedupeKey);
            return [{ channel: client_1.DeliveryChannel.EMAIL, status: client_1.DeliveryStatus.SKIPPED }];
        }
        const attempts = [];
        for (const channel of channels) {
            if (channel === 'EMAIL') {
                const result = await this.emailProvider.send(recipient.email, content.subject, content.body, attachments, content.html);
                const status = result.ok ? client_1.DeliveryStatus.SENT : client_1.DeliveryStatus.FAILED;
                await this.log(tenantId, client_1.DeliveryChannel.EMAIL, event, recipient.email, status, result.error, related, dedupeKey);
                attempts.push({ channel: client_1.DeliveryChannel.EMAIL, status });
            }
            else if (channel === 'WHATSAPP') {
                const result = await this.whatsappProvider.send(recipient.mobile, content.body);
                const status = result.ok ? client_1.DeliveryStatus.SENT : client_1.DeliveryStatus.FAILED;
                await this.log(tenantId, client_1.DeliveryChannel.WHATSAPP, event, recipient.mobile, status, result.error, related, dedupeKey);
                attempts.push({ channel: client_1.DeliveryChannel.WHATSAPP, status });
            }
            else if (channel === 'SMS') {
                const result = await this.smsProvider.send(recipient.mobile, content.body);
                const status = result.ok ? client_1.DeliveryStatus.SENT : client_1.DeliveryStatus.FAILED;
                await this.log(tenantId, client_1.DeliveryChannel.SMS, event, recipient.mobile, status, result.error, related, dedupeKey);
                attempts.push({ channel: client_1.DeliveryChannel.SMS, status });
            }
        }
        return attempts;
    }
    async wasReminded(tenantId, event, dedupeKey) {
        const existing = await this.prisma.platform.deliveryLog.findFirst({ where: { tenantId, event, dedupeKey } });
        return existing !== null;
    }
    async notifyOps(tenantId, event, text, related) {
        const settings = await this.prisma.platform.tenantSettings.findUnique({ where: { tenantId } });
        if (!settings?.slackWebhookUrl) {
            await this.log(tenantId, client_1.DeliveryChannel.SLACK, event, 'ops', client_1.DeliveryStatus.SKIPPED, 'No Slack webhook configured', related);
            return;
        }
        const result = await this.slackProvider.send(settings.slackWebhookUrl, text);
        await this.log(tenantId, client_1.DeliveryChannel.SLACK, event, 'ops', result.ok ? client_1.DeliveryStatus.SENT : client_1.DeliveryStatus.FAILED, result.error, related);
    }
    async log(tenantId, channel, event, recipient, status, errorMessage, related, dedupeKey) {
        try {
            await this.prisma.platform.deliveryLog.create({
                data: {
                    tenantId,
                    channel,
                    event,
                    recipient,
                    status,
                    errorMessage,
                    relatedEntityType: related.type,
                    relatedEntityId: related.id,
                    dedupeKey,
                },
            });
        }
        catch {
        }
    }
};
exports.MessagingService = MessagingService;
exports.MessagingService = MessagingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_provider_1.EmailProvider,
        sms_provider_1.SmsProvider,
        whatsapp_provider_1.WhatsAppProvider,
        slack_provider_1.SlackProvider])
], MessagingService);
//# sourceMappingURL=messaging.service.js.map