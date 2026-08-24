"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const reports_service_1 = require("./reports.service");
const sales_report_query_dto_1 = require("./dto/sales-report-query.dto");
const sales_summary_query_dto_1 = require("./dto/sales-summary-query.dto");
const invoices_report_query_dto_1 = require("./dto/invoices-report-query.dto");
const payments_report_query_dto_1 = require("./dto/payments-report-query.dto");
const pagination_query_dto_1 = require("./dto/pagination-query.dto");
const paginated_date_range_query_dto_1 = require("./dto/paginated-date-range-query.dto");
const purchases_report_query_dto_1 = require("./dto/purchases-report-query.dto");
const labour_revenue_report_query_dto_1 = require("./dto/labour-revenue-report-query.dto");
const date_range_query_dto_1 = require("./dto/date-range-query.dto");
const comeback_rate_query_dto_1 = require("./dto/comeback-rate-query.dto");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
let ReportsController = class ReportsController {
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    sales(query) {
        return this.reportsService.sales(query);
    }
    salesSummary(query) {
        return this.reportsService.salesSummary(query);
    }
    invoices(query) {
        return this.reportsService.invoices(query);
    }
    payments(query) {
        return this.reportsService.payments(query);
    }
    outstanding(query) {
        return this.reportsService.outstanding(query);
    }
    partsSales(query) {
        return this.reportsService.partsSales(query);
    }
    inventoryValuation(query) {
        return this.reportsService.inventoryValuation(query);
    }
    purchases(query) {
        return this.reportsService.purchases(query);
    }
    supplierOutstanding(query) {
        return this.reportsService.supplierOutstanding(query);
    }
    labourRevenue(query) {
        return this.reportsService.labourRevenue(query);
    }
    technicianPerformance(query) {
        return this.reportsService.technicianPerformance(query);
    }
    customerRevenue(query) {
        return this.reportsService.customerRevenue(query);
    }
    profitMargin(query) {
        return this.reportsService.profitMargin(query);
    }
    gstSummary(query) {
        return this.reportsService.gstSummary(query);
    }
    jobCardStatus(query) {
        return this.reportsService.jobCardStatus(query);
    }
    packagesSummary(query) {
        return this.reportsService.packagesSummary(query);
    }
    loyaltyLiability() {
        return this.reportsService.loyaltyLiability();
    }
    warrantyLiability() {
        return this.reportsService.warrantyLiability();
    }
    warrantyClaimsSummary(query) {
        return this.reportsService.warrantyClaimsSummary(query);
    }
    comebackRate(query) {
        return this.reportsService.comebackRate(query);
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('sales'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [sales_report_query_dto_1.SalesReportQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "sales", null);
__decorate([
    (0, common_1.Get)('sales-summary'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [sales_summary_query_dto_1.SalesSummaryQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "salesSummary", null);
__decorate([
    (0, common_1.Get)('invoices'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [invoices_report_query_dto_1.InvoicesReportQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "invoices", null);
__decorate([
    (0, common_1.Get)('payments'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payments_report_query_dto_1.PaymentsReportQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "payments", null);
__decorate([
    (0, common_1.Get)('outstanding'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_query_dto_1.PaginationQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "outstanding", null);
__decorate([
    (0, common_1.Get)('parts-sales'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [paginated_date_range_query_dto_1.PaginatedDateRangeQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "partsSales", null);
__decorate([
    (0, common_1.Get)('inventory-valuation'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_query_dto_1.PaginationQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "inventoryValuation", null);
__decorate([
    (0, common_1.Get)('purchases'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [purchases_report_query_dto_1.PurchasesReportQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "purchases", null);
__decorate([
    (0, common_1.Get)('supplier-outstanding'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_query_dto_1.PaginationQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "supplierOutstanding", null);
__decorate([
    (0, common_1.Get)('labour-revenue'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [labour_revenue_report_query_dto_1.LabourRevenueReportQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "labourRevenue", null);
__decorate([
    (0, common_1.Get)('technician-performance'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [paginated_date_range_query_dto_1.PaginatedDateRangeQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "technicianPerformance", null);
__decorate([
    (0, common_1.Get)('customer-revenue'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [paginated_date_range_query_dto_1.PaginatedDateRangeQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "customerRevenue", null);
__decorate([
    (0, common_1.Get)('profit-margin'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [date_range_query_dto_1.DateRangeQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "profitMargin", null);
__decorate([
    (0, common_1.Get)('gst-summary'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [date_range_query_dto_1.DateRangeQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "gstSummary", null);
__decorate([
    (0, common_1.Get)('job-card-status'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [date_range_query_dto_1.DateRangeQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "jobCardStatus", null);
__decorate([
    (0, common_1.Get)('packages-summary'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_query_dto_1.PaginationQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "packagesSummary", null);
__decorate([
    (0, common_1.Get)('loyalty-liability'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "loyaltyLiability", null);
__decorate([
    (0, common_1.Get)('warranty-liability'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "warrantyLiability", null);
__decorate([
    (0, common_1.Get)('warranty-claims-summary'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_query_dto_1.PaginationQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "warrantyClaimsSummary", null);
__decorate([
    (0, common_1.Get)('comeback-rate'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [comeback_rate_query_dto_1.ComebackRateQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "comebackRate", null);
exports.ReportsController = ReportsController = __decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('reports'),
    (0, common_1.Controller)('reports'),
    (0, permissions_decorator_1.Permissions)('report:read'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map