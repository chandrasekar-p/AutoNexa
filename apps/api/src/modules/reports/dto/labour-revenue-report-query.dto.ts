import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginatedDateRangeQueryDto } from './paginated-date-range-query.dto';

export class LabourRevenueReportQueryDto extends PaginatedDateRangeQueryDto {
  @ApiPropertyOptional({ description: 'Group totals by technician instead of one grand total' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  groupByTechnician?: boolean;
}
