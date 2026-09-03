import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Max, Min } from 'class-validator';

export class CreatePurchaseOrderItemDto {
  @ApiProperty()
  @IsUUID()
  partId: string;

  // Decimal(10,3) — fractional ordering (e.g. 50.500 L of coolant), not
  // just whole pieces.
  @ApiProperty({ example: 50.5 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantityOrdered: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitCost: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  gstRate: number;
}
