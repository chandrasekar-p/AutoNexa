import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InspectionCategory, InspectionResult } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

// Used for ad-hoc items added on top of the default checklist
// (see default-inspection-checklist.ts) via POST /inspections/:id/items.
export class CreateInspectionItemDto {
  @ApiProperty({ enum: InspectionCategory })
  @IsEnum(InspectionCategory)
  category: InspectionCategory;

  @ApiProperty({ example: 'Cabin Air Filter' })
  @IsString()
  @IsNotEmpty()
  itemName: string;

  @ApiPropertyOptional({ enum: InspectionResult, default: InspectionResult.NOT_CHECKED })
  @IsOptional()
  @IsEnum(InspectionResult)
  result?: InspectionResult;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}
