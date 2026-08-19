import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsUUID, Min } from 'class-validator';

export class CreatePurchaseOrderItemDto {
  @ApiProperty()
  @IsUUID()
  partId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantityOrdered: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitCost: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  gstRate: number;
}
