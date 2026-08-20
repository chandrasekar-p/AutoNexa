import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginatedDateRangeQueryDto } from './paginated-date-range-query.dto';

export class PurchasesReportQueryDto extends PaginatedDateRangeQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;
}
