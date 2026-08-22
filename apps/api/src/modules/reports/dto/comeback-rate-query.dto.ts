import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class ComebackRateQueryDto {
  @ApiProperty({ enum: ['technician', 'part', 'supplier'] })
  @IsIn(['technician', 'part', 'supplier'])
  groupBy: 'technician' | 'part' | 'supplier';

  @ApiPropertyOptional({ description: 'Range start (inclusive) — filters by WarrantyClaim.createdAt' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Range end (inclusive)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
