import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { DateRangeQueryDto } from './date-range-query.dto';

export class SalesSummaryQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ enum: ['day', 'month'], default: 'day' })
  @IsOptional()
  @IsIn(['day', 'month'])
  groupBy?: 'day' | 'month' = 'day';
}
