import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { STOCK_ADJUSTMENT_REASONS, type StockAdjustmentDirection, type StockAdjustmentReason } from '../part-stock-adjustment';

export class AdjustPartStockDto {
  @ApiProperty({ enum: ['IN', 'OUT'] })
  @IsIn(['IN', 'OUT'])
  direction: StockAdjustmentDirection;

  // Decimal(10,3) — fractional adjustment (e.g. 2.750 L), not just whole pieces.
  @ApiProperty({ minimum: 0.001, example: 2.5 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity: number;

  @ApiProperty({ enum: STOCK_ADJUSTMENT_REASONS })
  @IsIn(STOCK_ADJUSTMENT_REASONS)
  reason: StockAdjustmentReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
