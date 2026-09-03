import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class ReceiveGoodsItemDto {
  @ApiProperty()
  @IsUUID()
  purchaseOrderItemId: string;

  // Decimal(10,3) — fractional receiving (e.g. 50.500 L of coolant), not
  // just whole pieces.
  @ApiProperty({ example: 50.5 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantityReceived: number;
}

export class ReceiveGoodsDto {
  @ApiProperty({ type: [ReceiveGoodsItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceiveGoodsItemDto)
  items: ReceiveGoodsItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
