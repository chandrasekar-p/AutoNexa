import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstimateLineItemType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateEstimateLineItemDto {
  @ApiProperty({ enum: EstimateLineItemType })
  @IsEnum(EstimateLineItemType)
  itemType: EstimateLineItemType;

  @ApiProperty({ example: 'Front brake pads' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  quantity?: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ default: 18 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  gstRate?: number;
}
