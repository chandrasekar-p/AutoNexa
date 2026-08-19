import { ApiPropertyOptional } from '@nestjs/swagger';
import { InspectionResult } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateInspectionItemDto {
  @ApiPropertyOptional({ enum: InspectionResult })
  @IsOptional()
  @IsEnum(InspectionResult)
  result?: InspectionResult;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}
