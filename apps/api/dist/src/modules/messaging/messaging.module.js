"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingModule = void 0;
const common_1 = require("@nestjs/common");
const messaging_service_1 = require("./messaging.service");
const email_provider_1 = require("./providers/email.provider");
const sms_provider_1 = require("./providers/sms.provider");
const whatsapp_provider_1 = require("./providers/whatsapp.provider");
const slack_provider_1 = require("./providers/slack.provider");
const reminder_cron_service_1 = require("./reminder-cron.service");
const delivery_logs_controller_1 = require("./delivery-logs.controller");
const delivery_logs_service_1 = require("./delivery-logs.service");
let MessagingModule = class MessagingModule {
};
exports.MessagingModule = MessagingModule;
exports.MessagingModule = MessagingModule = __decorate([
    (0, common_1.Module)({
        controllers: [delivery_logs_controller_1.DeliveryLogsController],
        providers: [
            messaging_service_1.MessagingService,
            email_provider_1.EmailProvider,
            sms_provider_1.SmsProvider,
            whatsapp_provider_1.WhatsAppProvider,
            slack_provider_1.SlackProvider,
            reminder_cron_service_1.ReminderCronService,
            delivery_logs_service_1.DeliveryLogsService,
        ],
        exports: [messaging_service_1.MessagingService],
    })
], MessagingModule);
//# sourceMappingURL=messaging.module.js.map