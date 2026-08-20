import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { DateRangeQueryDto } from './date-range-query.dto';

// TS classes only support single inheritance, so pagination fields are
// re-declared here rather than also extending PaginationQueryDto — still
// less repetition than duplicating from/to across every report DTO too.
export class PaginatedDateRangeQueryDto extends DateRangeQueryDto {
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
