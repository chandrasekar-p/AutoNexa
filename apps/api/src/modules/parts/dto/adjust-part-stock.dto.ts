import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { STOCK_ADJUSTMENT_REASONS, type StockAdjustmentDirection, type StockAdjustmentReason } from '../part-stock-adjustment';

export class AdjustPartStockDto {
  @ApiProperty({ enum: ['IN', 'OUT'] })
  @IsIn(['IN', 'OUT'])
  direction: StockAdjustmentDirection;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ enum: STOCK_ADJUSTMENT_REASONS })
  @IsIn(STOCK_ADJUSTMENT_REASONS)
  reason: StockAdjustmentReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
