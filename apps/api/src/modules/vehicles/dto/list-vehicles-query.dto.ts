import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { UUID_SHAPE_REGEX, INVALID_UUID_MESSAGE } from '../../../common/validators/uuid-like';

const EXPIRY_FILTER_VALUES = ['active', 'expiring_soon', 'expired', 'not_set'] as const;

export class ListVehiclesQueryDto {
  @ApiPropertyOptional({ description: 'Free-text search across registration number, VIN, brand, model' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(UUID_SHAPE_REGEX, { message: INVALID_UUID_MESSAGE })
  customerId?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'EXPIRED', 'NO_DATA'], description: 'The combined per-row status (see vehicle-status.ts)' })
  @IsOptional()
  @IsIn(['ACTIVE', 'EXPIRED', 'NO_DATA'])
  status?: 'ACTIVE' | 'EXPIRED' | 'NO_DATA';

  @ApiPropertyOptional({ enum: EXPIRY_FILTER_VALUES })
  @IsOptional()
  @IsIn(EXPIRY_FILTER_VALUES)
  insurance?: (typeof EXPIRY_FILTER_VALUES)[number];

  @ApiPropertyOptional({ enum: EXPIRY_FILTER_VALUES })
  @IsOptional()
  @IsIn(EXPIRY_FILTER_VALUES)
  puc?: (typeof EXPIRY_FILTER_VALUES)[number];

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
