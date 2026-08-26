import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { UUID_SHAPE_REGEX, INVALID_UUID_MESSAGE } from '../../../common/validators/uuid-like';
import { INSPECTION_DISPLAY_STATUSES, InspectionDisplayStatus } from '../inspection-display-status';

export class ListInspectionsQueryDto {
  @ApiPropertyOptional({ description: 'Free-text search across notes, vehicle registration number, and customer name/mobile' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(UUID_SHAPE_REGEX, { message: INVALID_UUID_MESSAGE })
  vehicleId?: string;

  // The derived display status (Pending Review/Overdue included), not the
  // raw stored InspectionStatus enum — see inspection-display-status.ts.
  @ApiPropertyOptional({ enum: INSPECTION_DISPLAY_STATUSES })
  @IsOptional()
  @IsIn(INSPECTION_DISPLAY_STATUSES)
  status?: InspectionDisplayStatus;

  @ApiPropertyOptional({ description: 'Started-date range filter start (inclusive)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Started-date range filter end (inclusive)' })
  @IsOptional()
  @IsDateString()
  to?: string;

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
