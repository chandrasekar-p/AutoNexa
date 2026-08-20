"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const throttler_2 = require("@nestjs/throttler");
const configuration_1 = __importDefault(require("./config/configuration"));
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./modules/auth/auth.module");
const tenants_module_1 = require("./modules/tenants/tenants.module");
const branches_module_1 = require("./modules/branches/branches.module");
const users_module_1 = require("./modules/users/users.module");
const roles_module_1 = require("./modules/roles/roles.module");
const permissions_module_1 = require("./modules/permissions/permissions.module");
const customers_module_1 = require("./modules/customers/customers.module");
const vehicles_module_1 = require("./modules/vehicles/vehicles.module");
const appointments_module_1 = require("./modules/appointments/appointments.module");
const inspections_module_1 = require("./modules/inspections/inspections.module");
const estimates_module_1 = require("./modules/estimates/estimates.module");
const labour_items_module_1 = require("./modules/labour-items/labour-items.module");
const technicians_module_1 = require("./modules/technicians/technicians.module");
const job_cards_module_1 = require("./modules/job-cards/job-cards.module");
const parts_module_1 = require("./modules/parts/parts.module");
const suppliers_module_1 = require("./modules/suppliers/suppliers.module");
const purchase_orders_module_1 = require("./modules/purchase-orders/purchase-orders.module");
const purchase_invoices_module_1 = require("./modules/purchase-invoices/purchase-invoices.module");
const supplier_payments_module_1 = require("./modules/supplier-payments/supplier-payments.module");
const invoices_module_1 = require("./modules/invoices/invoices.module");
const reports_module_1 = require("./modules/reports/reports.module");
const dashboard_module_1 = require("./modules/dashboard/dashboard.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, load: [configuration_1.default] }),
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            tenants_module_1.TenantsModule,
            branches_module_1.BranchesModule,
            users_module_1.UsersModule,
            roles_module_1.RolesModule,
            permissions_module_1.PermissionsModule,
            customers_module_1.CustomersModule,
            vehicles_module_1.VehiclesModule,
            appointments_module_1.AppointmentsModule,
            inspections_module_1.InspectionsModule,
            estimates_module_1.EstimatesModule,
            labour_items_module_1.LabourItemsModule,
            technicians_module_1.TechniciansModule,
            job_cards_module_1.JobCardsModule,
            parts_module_1.PartsModule,
            suppliers_module_1.SuppliersModule,
            purchase_orders_module_1.PurchaseOrdersModule,
            purchase_invoices_module_1.PurchaseInvoicesModule,
            supplier_payments_module_1.SupplierPaymentsModule,
            invoices_module_1.InvoicesModule,
            reports_module_1.ReportsModule,
            dashboard_module_1.DashboardModule,
            notifications_module_1.NotificationsModule,
        ],
        providers: [{ provide: core_1.APP_GUARD, useClass: throttler_2.ThrottlerGuard }],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map