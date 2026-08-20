import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
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
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { SearchModule } from './modules/search/search.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { AttendanceModule } from './modules/attendance/attendance.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ScheduleModule.forRoot(),
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
    AuditLogsModule,
    SearchModule,
    UploadsModule,
    MessagingModule,
    AttendanceModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Every controller across the app already tags its mutating routes
    // with @Audit('action', 'Entity') (see common/interceptors/audit-log.interceptor.ts)
    // — this is the actual wiring that makes those tags do anything.
    // Registered globally, same pattern as JwtAuthGuard/PermissionsGuard
    // in auth.module.ts, so no per-controller opt-in is needed anywhere.
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}
