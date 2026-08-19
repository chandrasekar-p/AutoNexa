import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PurchaseInvoicesService } from './purchase-invoices.service';
import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { UpdatePurchaseInvoiceDto } from './dto/update-purchase-invoice.dto';
import { ListPurchaseInvoicesQueryDto } from './dto/list-purchase-invoices-query.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit-log.interceptor';

// No DELETE route — PurchaseInvoice has no deletedAt (financial records
// are corrected with new entries, not removed; same reasoning as
// SupplierPayment/InventoryTransaction being append-only).
@ApiBearerAuth()
@ApiTags('purchase-invoices')
@Controller('purchase-invoices')
export class PurchaseInvoicesController {
  constructor(private readonly purchaseInvoicesService: PurchaseInvoicesService) {}

  @Permissions('purchase:create')
  @Post()
  @Audit('purchase-invoice.create', 'PurchaseInvoice')
  create(@Body() dto: CreatePurchaseInvoiceDto) {
    return this.purchaseInvoicesService.create(dto);
  }

  @Permissions('purchase:read')
  @Get()
  findAll(@Query() query: ListPurchaseInvoicesQueryDto) {
    return this.purchaseInvoicesService.findAll(query);
  }

  @Permissions('purchase:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchaseInvoicesService.findOne(id);
  }

  @Permissions('purchase:update')
  @Patch(':id')
  @Audit('purchase-invoice.update', 'PurchaseInvoice')
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseInvoiceDto) {
    return this.purchaseInvoicesService.update(id, dto);
  }
}
