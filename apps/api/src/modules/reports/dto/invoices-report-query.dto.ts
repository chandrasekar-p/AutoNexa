import { ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginatedDateRangeQueryDto } from './paginated-date-range-query.dto';

export class InvoicesReportQueryDto extends PaginatedDateRangeQueryDto {
  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}
