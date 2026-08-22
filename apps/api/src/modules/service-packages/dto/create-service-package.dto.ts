import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
import { UUID_SHAPE_REGEX, INVALID_UUID_MESSAGE } from '../../../common/validators/uuid-like';

export class CreateServicePackageDto {
  @ApiProperty({ example: 'Annual Maintenance Contract — Basic' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 4999 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 18 })
  @IsNumber()
  @Min(0)
  gstRate: number;

  @ApiProperty({ example: 12, description: 'How long this package is valid for once sold' })
  @IsInt()
  @Min(1)
  validityMonths: number;

  @ApiPropertyOptional({ description: 'Max redeemable visits within the validity period; omit for unlimited' })
  @IsOptional()
  @IsInt()
  @Min(1)
  visitLimit?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'LabourItem ids this package covers for free' })
  @IsOptional()
  @IsArray()
  @Matches(UUID_SHAPE_REGEX, { each: true, message: INVALID_UUID_MESSAGE })
  labourItemIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Part ids this package covers for free' })
  @IsOptional()
  @IsArray()
  @Matches(UUID_SHAPE_REGEX, { each: true, message: INVALID_UUID_MESSAGE })
  partIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'PartCategory ids this package covers for free (any part in these categories)' })
  @IsOptional()
  @IsArray()
  @Matches(UUID_SHAPE_REGEX, { each: true, message: INVALID_UUID_MESSAGE })
  partCategoryIds?: string[];
}
