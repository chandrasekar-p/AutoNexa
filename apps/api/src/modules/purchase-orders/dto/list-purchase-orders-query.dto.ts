import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PurchaseOrderStatus } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export type PurchaseOrderBucket = 'pending' | 'received' | 'cancelled';
const PURCHASE_ORDER_BUCKETS: PurchaseOrderBucket[] = ['pending', 'received', 'cancelled'];

export class ListPurchaseOrdersQueryDto {
  @ApiPropertyOptional({ description: 'Free-text search across PO number' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({ enum: PurchaseOrderStatus })
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @ApiPropertyOptional({
    enum: PURCHASE_ORDER_BUCKETS,
    description: 'Derived status grouping for the KPI quick-filters — ignored if `status` is also given',
  })
  @IsOptional()
  @IsIn(PURCHASE_ORDER_BUCKETS)
  bucket?: PurchaseOrderBucket;

  @ApiPropertyOptional({ description: 'ISO date — orders created on/after this date' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO date — orders created on/before this date' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ description: 'ISO date — expected delivery on/after this date' })
  @IsOptional()
  @IsString()
  expectedFrom?: string;

  @ApiPropertyOptional({ description: 'ISO date — expected delivery on/before this date' })
  @IsOptional()
  @IsString()
  expectedTo?: string;

  @ApiPropertyOptional({ description: 'Minimum order value (sum of line totals)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minValue?: number;

  @ApiPropertyOptional({ description: 'Maximum order value (sum of line totals)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxValue?: number;

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
