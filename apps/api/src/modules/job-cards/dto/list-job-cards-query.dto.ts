import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { JobCardStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, Min } from 'class-validator';
import { UUID_SHAPE_REGEX, INVALID_UUID_MESSAGE } from '../../../common/validators/uuid-like';

export class ListJobCardsQueryDto {
  @ApiPropertyOptional({ description: 'Free-text search across job card number and complaint' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: JobCardStatus })
  @IsOptional()
  @IsEnum(JobCardStatus)
  status?: JobCardStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  technicianId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serviceAdvisorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(UUID_SHAPE_REGEX, { message: INVALID_UUID_MESSAGE })
  vehicleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(UUID_SHAPE_REGEX, { message: INVALID_UUID_MESSAGE })
  customerId?: string;

  @ApiPropertyOptional({ description: 'Vehicle brand, contains-match (e.g. from the curated brand filter list)' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ description: 'Only this caller’s own assigned job cards (technician) or advised job cards (service advisor)' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  mine?: boolean;

  @ApiPropertyOptional({ enum: ['today', 'delayed'], description: 'Quick filter on expectedDelivery, mirroring computeJobCardDelayStatus' })
  @IsOptional()
  @IsIn(['today', 'delayed'])
  dueDate?: 'today' | 'delayed';

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
