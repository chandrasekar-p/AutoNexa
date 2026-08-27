import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InvoiceStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { UUID_SHAPE_REGEX, INVALID_UUID_MESSAGE } from '../../../common/validators/uuid-like';
import { INVOICE_DISPLAY_STATUSES, type InvoiceDisplayStatus } from '../invoice-overdue';

export class ListInvoicesQueryDto {
  @ApiPropertyOptional({ description: 'Free-text search across invoice number, job card number, and vehicle registration number' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(UUID_SHAPE_REGEX, { message: INVALID_UUID_MESSAGE })
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(UUID_SHAPE_REGEX, { message: INVALID_UUID_MESSAGE })
  vehicleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(UUID_SHAPE_REGEX, { message: INVALID_UUID_MESSAGE })
  jobCardId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(UUID_SHAPE_REGEX, { message: INVALID_UUID_MESSAGE })
  serviceAdvisorId?: string;

  // Kept alongside the new displayStatus (the raw stored value — mostly
  // superseded by displayStatus, but left in place since it's the exact
  // value @IsEnum(InvoiceStatus) validates against and nothing forces
  // every caller to migrate at once).
  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({ enum: INVOICE_DISPLAY_STATUSES, description: 'The derived status (Overdue included) — see invoice-overdue.ts' })
  @IsOptional()
  @IsIn(INVOICE_DISPLAY_STATUSES)
  displayStatus?: InvoiceDisplayStatus;

  @ApiPropertyOptional({ description: 'createdAt range filter start (inclusive)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'createdAt range filter end (inclusive)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Minimum grandTotal' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum grandTotal' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
