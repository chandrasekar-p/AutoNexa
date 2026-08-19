import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoicePaymentDto } from './dto/create-invoice-payment.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit-log.interceptor';

// No POST /invoices (direct create) and no PATCH/DELETE — every field on
// an Invoice is system-computed (subtotal/GST/grandTotal/status), nothing
// a user directly edits. Invoices are only ever generated from a job card
// (POST /job-cards/:id/generate-invoice) and paid down via payments here.
@ApiBearerAuth()
@ApiTags('invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Permissions('invoice:read')
  @Get()
  findAll(@Query() query: ListInvoicesQueryDto) {
    return this.invoicesService.findAll(query);
  }

  @Permissions('invoice:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Permissions('payment:create')
  @Post(':id/payments')
  @Audit('invoice.payment.record', 'Payment')
  recordPayment(@Param('id') id: string, @Body() dto: CreateInvoicePaymentDto) {
    return this.invoicesService.recordPayment(id, dto);
  }
}
