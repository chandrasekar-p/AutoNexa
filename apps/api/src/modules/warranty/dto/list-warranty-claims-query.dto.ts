import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { WarrantyClaimStatus } from '@prisma/client';
import { UUID_SHAPE_REGEX, INVALID_UUID_MESSAGE } from '../../../common/validators/uuid-like';

export class ListWarrantyClaimsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(UUID_SHAPE_REGEX, { message: INVALID_UUID_MESSAGE })
  vehicleId?: string;

  @ApiPropertyOptional({ enum: WarrantyClaimStatus })
  @IsOptional()
  @IsEnum(WarrantyClaimStatus)
  status?: WarrantyClaimStatus;

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
