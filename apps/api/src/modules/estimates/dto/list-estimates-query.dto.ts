import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EstimateStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { UUID_SHAPE_REGEX, INVALID_UUID_MESSAGE } from '../../../common/validators/uuid-like';

/** The real EstimateStatus values plus the derived-only 'AWAITING_APPROVAL' pseudo-status (see estimate-approval-status.ts). */
const APPROVAL_STATUS_VALUES = [...Object.values(EstimateStatus), 'AWAITING_APPROVAL'] as const;

export class ListEstimatesQueryDto {
  @ApiPropertyOptional({ description: 'Free-text search across job description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(UUID_SHAPE_REGEX, { message: INVALID_UUID_MESSAGE })
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(UUID_SHAPE_REGEX, { message: INVALID_UUID_MESSAGE })
  vehicleId?: string;

  @ApiPropertyOptional({ enum: EstimateStatus })
  @IsOptional()
  @IsEnum(EstimateStatus)
  status?: EstimateStatus;

  @ApiPropertyOptional({
    enum: APPROVAL_STATUS_VALUES,
    description:
      "Filters on the derived approval status the Estimates list page shows — 'SENT' here means plain sent (not yet opened), excluding anything the customer has opened; 'AWAITING_APPROVAL' means opened but not yet decided. Takes precedence over `status` when both are given.",
  })
  @IsOptional()
  @IsIn(APPROVAL_STATUS_VALUES)
  approvalStatus?: EstimateStatus | 'AWAITING_APPROVAL';

  @ApiPropertyOptional({ description: 'Range start (inclusive), filtered on createdAt' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Range end (inclusive), filtered on createdAt' })
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
