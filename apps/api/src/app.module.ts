import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { BranchesModule } from './modules/branches/branches.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { CustomersModule } from './modules/customers/customers.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { InspectionsModule } from './modules/inspections/inspections.module';
import { EstimatesModule } from './modules/estimates/estimates.module';
import { LabourItemsModule } from './modules/labour-items/labour-items.module';
import { TechniciansModule } from './modules/technicians/technicians.module';
import { JobCardsModule } from './modules/job-cards/job-cards.module';
import { PartsModule } from './modules/parts/parts.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { PurchaseInvoicesModule } from './modules/purchase-invoices/purchase-invoices.module';
import { SupplierPaymentsModule } from './modules/supplier-payments/supplier-payments.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    TenantsModule,
    BranchesModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    CustomersModule,
    VehiclesModule,
    AppointmentsModule,
    InspectionsModule,
    EstimatesModule,
    LabourItemsModule,
    TechniciansModule,
    JobCardsModule,
    PartsModule,
    SuppliersModule,
    PurchaseOrdersModule,
    PurchaseInvoicesModule,
    SupplierPaymentsModule,
    InvoicesModule,
    ReportsModule,
    DashboardModule,
    NotificationsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
