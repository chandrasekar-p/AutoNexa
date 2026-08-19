import { Module } from '@nestjs/common';
import { PurchaseInvoicesModule } from '../purchase-invoices/purchase-invoices.module';
import { SupplierPaymentsService } from './supplier-payments.service';
import { SupplierPaymentsController } from './supplier-payments.controller';

@Module({
  imports: [PurchaseInvoicesModule],
  controllers: [SupplierPaymentsController],
  providers: [SupplierPaymentsService],
  exports: [SupplierPaymentsService],
})
export class SupplierPaymentsModule {}
