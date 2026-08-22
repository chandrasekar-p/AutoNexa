import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module';
import { ServicePackagesService } from './service-packages.service';
import { ServicePackagesController } from './service-packages.controller';
import { CustomerServicePackagesService } from './customer-service-packages.service';
import { CustomerServicePackagesController } from './customer-service-packages.controller';

// Depends on InvoicesModule for InvoicesService.createInvoiceInTransaction
// — same dependency shape JobCardsModule already has on InvoicesModule
// for generateInvoice.
@Module({
  imports: [InvoicesModule],
  controllers: [ServicePackagesController, CustomerServicePackagesController],
  providers: [ServicePackagesService, CustomerServicePackagesService],
  exports: [ServicePackagesService, CustomerServicePackagesService],
})
export class ServicePackagesModule {}
