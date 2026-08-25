import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, IsNumber, IsUrl, Matches, Min } from 'class-validator';

const HH_MM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const INVALID_TIME_MESSAGE = 'Must be a 24-hour time in HH:mm format, e.g. 09:00';

export class UpdateTenantSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobCardPrefix?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoicePrefix?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estimatePrefix?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  poPrefix?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  defaultGstRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'The workshop\'s own home state — used to determine CGST+SGST vs IGST on generated invoices',
    example: 'Tamil Nadu',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: 'Relative path from POST /uploads (e.g. /uploads/<tenantId>/<uuid>.png), not an external URL',
  })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: "Incoming webhook URL for this workshop's own Slack — internal ops pings only, never customer-facing",
  })
  @IsOptional()
  @IsUrl()
  slackWebhookUrl?: string;

  @ApiPropertyOptional({ description: '24-hour opening time, e.g. "09:00"', example: '09:00' })
  @IsOptional()
  @Matches(HH_MM_REGEX, { message: INVALID_TIME_MESSAGE })
  businessHoursOpen?: string;

  @ApiPropertyOptional({ description: '24-hour closing time, e.g. "19:00"', example: '19:00' })
  @IsOptional()
  @Matches(HH_MM_REGEX, { message: INVALID_TIME_MESSAGE })
  businessHoursClose?: string;

  @ApiPropertyOptional({ description: 'Toggles the customer-facing insurance-expiry reminder cron' })
  @IsOptional()
  @IsBoolean()
  reminderInsuranceEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Toggles the customer-facing PUC-expiry reminder cron' })
  @IsOptional()
  @IsBoolean()
  reminderPucEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Toggles the customer-facing next-service-due reminder cron' })
  @IsOptional()
  @IsBoolean()
  reminderServiceDueEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Days-before-due thresholds shared by insurance/PUC/service-due date reminders, e.g. [30, 15, 7]',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  reminderThresholdDays?: number[];

  @ApiPropertyOptional({ description: 'Default months between services, used by next-service-due unless a vehicle overrides it' })
  @IsOptional()
  @IsInt()
  @Min(1)
  serviceIntervalMonths?: number;

  @ApiPropertyOptional({ description: 'Default km between services, used by next-service-due unless a vehicle overrides it' })
  @IsOptional()
  @IsInt()
  @Min(1)
  serviceIntervalKm?: number;

  @ApiPropertyOptional({ description: 'Whether customer-facing notifications (estimate ready, invoice issued, etc.) are sent by email — independent of whether SMTP is configured' })
  @IsOptional()
  @IsBoolean()
  notifyByEmail?: boolean;

  @ApiPropertyOptional({ description: 'Whether customer-facing notifications are sent by SMS — independent of whether Twilio is configured' })
  @IsOptional()
  @IsBoolean()
  notifyBySms?: boolean;

  @ApiPropertyOptional({ description: 'Whether customer-facing notifications are sent by WhatsApp — independent of whether the WhatsApp Cloud API is configured. Preferred over SMS when both are enabled and configured.' })
  @IsOptional()
  @IsBoolean()
  notifyByWhatsapp?: boolean;
}
