import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

const STOCK_STATUSES = ['in_stock', 'low_stock', 'out_of_stock'] as const;
export type PartStockStatus = (typeof STOCK_STATUSES)[number];

export class ListPartsQueryDto {
  @ApiPropertyOptional({ description: 'Free-text search across part number, SKU, name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: STOCK_STATUSES })
  @IsOptional()
  @IsIn(STOCK_STATUSES)
  stockStatus?: PartStockStatus;

  // Deprecated alias for stockStatus=low_stock — no known caller uses this
  // today (checked), kept only as a precaution against an untracked one.
  @ApiPropertyOptional({ deprecated: true, description: 'Deprecated — use stockStatus=low_stock' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  lowStock?: boolean;

  @ApiPropertyOptional({ description: 'Minimum sellingPrice' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum sellingPrice' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

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
