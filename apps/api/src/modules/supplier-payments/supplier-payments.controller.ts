import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SupplierPaymentsService } from './supplier-payments.service';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { ListSupplierPaymentsQueryDto } from './dto/list-supplier-payments-query.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit-log.interceptor';

@ApiBearerAuth()
@ApiTags('supplier-payments')
@Controller('supplier-payments')
export class SupplierPaymentsController {
  constructor(private readonly supplierPaymentsService: SupplierPaymentsService) {}

  @Permissions('purchase:create')
  @Post()
  @Audit('supplier-payment.create', 'SupplierPayment')
  create(@Body() dto: CreateSupplierPaymentDto) {
    return this.supplierPaymentsService.create(dto);
  }

  @Permissions('purchase:read')
  @Get()
  findAll(@Query() query: ListSupplierPaymentsQueryDto) {
    return this.supplierPaymentsService.findAll(query);
  }

  @Permissions('purchase:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.supplierPaymentsService.findOne(id);
  }
}
