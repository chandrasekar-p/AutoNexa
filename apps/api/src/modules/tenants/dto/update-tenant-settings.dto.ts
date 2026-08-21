import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsUrl, Matches } from 'class-validator';

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
}
