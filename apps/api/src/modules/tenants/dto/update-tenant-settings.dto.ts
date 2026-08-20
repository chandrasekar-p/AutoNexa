import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';

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
}
