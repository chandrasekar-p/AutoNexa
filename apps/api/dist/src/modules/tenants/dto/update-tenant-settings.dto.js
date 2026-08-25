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
exports.UpdateTenantSettingsDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const HH_MM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const INVALID_TIME_MESSAGE = 'Must be a 24-hour time in HH:mm format, e.g. 09:00';
class UpdateTenantSettingsDto {
}
exports.UpdateTenantSettingsDto = UpdateTenantSettingsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "jobCardPrefix", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "invoicePrefix", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "estimatePrefix", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "poPrefix", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "defaultGstRate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "timezone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'The workshop\'s own home state — used to determine CGST+SGST vs IGST on generated invoices',
        example: 'Tamil Nadu',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "state", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Relative path from POST /uploads (e.g. /uploads/<tenantId>/<uuid>.png), not an external URL',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "logoUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Incoming webhook URL for this workshop's own Slack — internal ops pings only, never customer-facing",
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "slackWebhookUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: '24-hour opening time, e.g. "09:00"', example: '09:00' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(HH_MM_REGEX, { message: INVALID_TIME_MESSAGE }),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "businessHoursOpen", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: '24-hour closing time, e.g. "19:00"', example: '19:00' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(HH_MM_REGEX, { message: INVALID_TIME_MESSAGE }),
    __metadata("design:type", String)
], UpdateTenantSettingsDto.prototype, "businessHoursClose", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Toggles the customer-facing insurance-expiry reminder cron' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "reminderInsuranceEnabled", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Toggles the customer-facing PUC-expiry reminder cron' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "reminderPucEnabled", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Toggles the customer-facing next-service-due reminder cron' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "reminderServiceDueEnabled", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Days-before-due thresholds shared by insurance/PUC/service-due date reminders, e.g. [30, 15, 7]',
        type: [Number],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsInt)({ each: true }),
    (0, class_validator_1.Min)(1, { each: true }),
    __metadata("design:type", Array)
], UpdateTenantSettingsDto.prototype, "reminderThresholdDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Default months between services, used by next-service-due unless a vehicle overrides it' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "serviceIntervalMonths", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Default km between services, used by next-service-due unless a vehicle overrides it' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateTenantSettingsDto.prototype, "serviceIntervalKm", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Whether customer-facing notifications (estimate ready, invoice issued, etc.) are sent by email — independent of whether SMTP is configured' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "notifyByEmail", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Whether customer-facing notifications are sent by SMS — independent of whether Twilio is configured' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "notifyBySms", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Whether customer-facing notifications are sent by WhatsApp — independent of whether the WhatsApp Cloud API is configured. Preferred over SMS when both are enabled and configured.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTenantSettingsDto.prototype, "notifyByWhatsapp", void 0);
//# sourceMappingURL=update-tenant-settings.dto.js.map