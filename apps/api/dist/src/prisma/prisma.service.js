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
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const tenant_context_1 = require("./tenant-context");
const TENANT_SCOPED_MODELS = new Set([
    'Branch',
    'User',
    'Role',
    'AuditLog',
    'Customer',
    'Vehicle',
    'VehicleDocument',
    'Appointment',
    'Inspection',
    'InspectionItem',
    'InspectionPhoto',
    'Estimate',
    'EstimateLineItem',
    'LabourItem',
    'Technician',
    'JobCard',
    'JobCardLabour',
    'JobCardStatusHistory',
    'JobCardNote',
    'PartCategory',
    'Part',
    'InventoryTransaction',
    'Supplier',
    'PurchaseOrder',
    'PurchaseOrderItem',
    'GoodsReceipt',
    'GoodsReceiptItem',
    'PurchaseInvoice',
    'SupplierPayment',
    'JobCardPart',
    'Invoice',
    'InvoiceLineItem',
    'Payment',
]);
const NULLABLE_TENANT_MODELS = new Set(['Role']);
let PrismaService = PrismaService_1 = class PrismaService extends client_1.PrismaClient {
    constructor() {
        super({
            log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
        });
        this.logger = new common_1.Logger(PrismaService_1.name);
        this.platform = this;
    }
    async onModuleInit() {
        await this.$connect();
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }
    forTenant() {
        const tenantId = tenant_context_1.TenantContext.requireTenantId();
        return this.$extends({
            query: {
                $allModels: {
                    async $allOperations(params) {
                        const { model, operation, args, query } = params;
                        if (!model || !TENANT_SCOPED_MODELS.has(model)) {
                            return query(args);
                        }
                        const isReadOrDelete = [
                            'findFirst',
                            'findFirstOrThrow',
                            'findUnique',
                            'findUniqueOrThrow',
                            'findMany',
                            'update',
                            'updateMany',
                            'delete',
                            'deleteMany',
                            'count',
                            'aggregate',
                        ].includes(operation);
                        if (isReadOrDelete) {
                            const a = args;
                            a.where = injectTenantFilter(a.where, model, tenantId);
                        }
                        if (operation === 'create') {
                            const a = args;
                            a.data = { ...a.data, tenantId };
                        }
                        if (operation === 'createMany') {
                            const a = args;
                            a.data = a.data.map((row) => ({ ...row, tenantId }));
                        }
                        return query(args);
                    },
                },
            },
        });
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
function injectTenantFilter(where, model, tenantId) {
    const w = where ?? {};
    if (NULLABLE_TENANT_MODELS.has(model)) {
        return {
            ...w,
            OR: [{ tenantId }, { tenantId: null }],
        };
    }
    return { ...w, tenantId };
}
//# sourceMappingURL=prisma.service.js.map