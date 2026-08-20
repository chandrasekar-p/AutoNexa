import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { SalesReportQueryDto } from './dto/sales-report-query.dto';
import { InvoicesReportQueryDto } from './dto/invoices-report-query.dto';
import { PaymentsReportQueryDto } from './dto/payments-report-query.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { PaginatedDateRangeQueryDto } from './dto/paginated-date-range-query.dto';
import { PurchasesReportQueryDto } from './dto/purchases-report-query.dto';
import { LabourRevenueReportQueryDto } from './dto/labour-revenue-report-query.dto';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';

// Every route here is read-only aggregation over data owned by other
// modules — gated uniformly by 'report:read', no @Audit() (nothing
// mutates). Low Stock is deliberately NOT duplicated here — it already
// exists as GET /parts?lowStock=true (Phase 6).
@ApiBearerAuth()
@ApiTags('reports')
@Controller('reports')
@Permissions('report:read')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  sales(@Query() query: SalesReportQueryDto) {
    return this.reportsService.sales(query);
  }

  @Get('invoices')
  invoices(@Query() query: InvoicesReportQueryDto) {
    return this.reportsService.invoices(query);
  }

  @Get('payments')
  payments(@Query() query: PaymentsReportQueryDto) {
    return this.reportsService.payments(query);
  }

  @Get('outstanding')
  outstanding(@Query() query: PaginationQueryDto) {
    return this.reportsService.outstanding(query);
  }

  @Get('parts-sales')
  partsSales(@Query() query: PaginatedDateRangeQueryDto) {
    return this.reportsService.partsSales(query);
  }

  @Get('inventory-valuation')
  inventoryValuation(@Query() query: PaginationQueryDto) {
    return this.reportsService.inventoryValuation(query);
  }

  @Get('purchases')
  purchases(@Query() query: PurchasesReportQueryDto) {
    return this.reportsService.purchases(query);
  }

  @Get('supplier-outstanding')
  supplierOutstanding(@Query() query: PaginationQueryDto) {
    return this.reportsService.supplierOutstanding(query);
  }

  @Get('labour-revenue')
  labourRevenue(@Query() query: LabourRevenueReportQueryDto) {
    return this.reportsService.labourRevenue(query);
  }

  @Get('technician-performance')
  technicianPerformance(@Query() query: PaginatedDateRangeQueryDto) {
    return this.reportsService.technicianPerformance(query);
  }

  @Get('customer-revenue')
  customerRevenue(@Query() query: PaginatedDateRangeQueryDto) {
    return this.reportsService.customerRevenue(query);
  }

  @Get('profit-margin')
  profitMargin(@Query() query: DateRangeQueryDto) {
    return this.reportsService.profitMargin(query);
  }

  @Get('gst-summary')
  gstSummary(@Query() query: DateRangeQueryDto) {
    return this.reportsService.gstSummary(query);
  }

  @Get('job-card-status')
  jobCardStatus(@Query() query: DateRangeQueryDto) {
    return this.reportsService.jobCardStatus(query);
  }
}
