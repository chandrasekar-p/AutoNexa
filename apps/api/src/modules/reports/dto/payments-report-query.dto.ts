import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginatedDateRangeQueryDto } from './paginated-date-range-query.dto';

export class PaymentsReportQueryDto extends PaginatedDateRangeQueryDto {
  @ApiPropertyOptional({ enum: ['cash', 'upi', 'card', 'bank_transfer', 'credit'] })
  @IsOptional()
  @IsIn(['cash', 'upi', 'card', 'bank_transfer', 'credit'])
  method?: string;
}
