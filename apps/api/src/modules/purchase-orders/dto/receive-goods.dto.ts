import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class ReceiveGoodsItemDto {
  @ApiProperty()
  @IsUUID()
  purchaseOrderItemId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
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
