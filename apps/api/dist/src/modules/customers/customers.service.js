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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenant_context_1 = require("../../prisma/tenant-context");
const outstanding_1 = require("../../common/billing/outstanding");
const generate_sequence_number_1 = require("../../common/sequence/generate-sequence-number");
const LIST_INCLUDE = {
    _count: { select: { vehicles: true } },
    jobCards: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
};
function toListRow(customer) {
    const { _count, jobCards, ...rest } = customer;
    return {
        ...rest,
        vehicleCount: _count.vehicles,
        lastVisitAt: jobCards[0]?.createdAt ?? null,
    };
}
let CustomersService = class CustomersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const tenantId = tenant_context_1.TenantContext.requireTenantId();
        const db = this.prisma.forTenant();
        const tenantSettings = await this.prisma.platform.tenantSettings.findUniqueOrThrow({ where: { tenantId } });
        return db.$transaction(async (tx) => {
            const customerNumber = await (0, generate_sequence_number_1.generateSequenceNumber)(tx, tenantId, 'CUSTOMER', tenantSettings.customerPrefix);
            return tx.customer.create({
                data: { ...dto, customerNumber },
            });
        });
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const db = this.prisma.forTenant();
        const where = {
            ...this.statusWhere(query.status),
            ...(query.customerType ? { customerType: query.customerType } : {}),
            ...(query.city ? { city: query.city } : {}),
            ...(query.search
                ? {
                    OR: [
                        { name: { contains: query.search, mode: 'insensitive' } },
                        { mobile: { contains: query.search } },
                        { email: { contains: query.search, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const [rows, total] = await Promise.all([
            db.customer.findMany({
                where,
                include: LIST_INCLUDE,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.customer.count({ where }),
        ]);
        return { items: rows.map(toListRow), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    async summary() {
        const db = this.prisma.forTenant();
        const [total, individual, business, cities, totalVehicles] = await Promise.all([
            db.customer.count({ where: { deletedAt: null } }),
            db.customer.count({ where: { deletedAt: null, customerType: 'individual' } }),
            db.customer.count({ where: { deletedAt: null, customerType: 'business' } }),
            db.customer.findMany({ where: { deletedAt: null, city: { not: null } }, select: { city: true }, distinct: ['city'] }),
            db.vehicle.count({ where: { deletedAt: null } }),
        ]);
        return {
            total,
            individual,
            business,
            cities: cities.map((c) => c.city).sort(),
            totalVehicles,
        };
    }
    statusWhere(status) {
        if (status === 'inactive')
            return { deletedAt: { not: null } };
        if (status === 'all')
            return {};
        return { deletedAt: null };
    }
    async findOne(id) {
        const customer = await this.prisma.forTenant().customer.findFirst({
            where: { id, deletedAt: null },
            include: {
                vehicles: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
                invoices: {
                    include: { payments: true },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!customer)
            throw new common_1.NotFoundException('Customer not found');
        const invoicesWithOutstanding = customer.invoices.map((invoice) => ({
            ...invoice,
            outstanding: (0, outstanding_1.computeInvoiceOutstanding)(invoice),
        }));
        const totalOutstanding = (0, outstanding_1.sumOutstanding)(invoicesWithOutstanding);
        return { ...customer, invoices: invoicesWithOutstanding, totalOutstanding };
    }
    async update(id, dto) {
        await this.assertExists(id);
        return this.prisma.forTenant().customer.update({ where: { id }, data: dto });
    }
    async remove(id) {
        await this.assertExists(id);
        return this.prisma.forTenant().customer.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
    async assertExists(id) {
        const customer = await this.prisma.forTenant().customer.findFirst({ where: { id, deletedAt: null } });
        if (!customer)
            throw new common_1.NotFoundException('Customer not found');
        return customer;
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomersService);
//# sourceMappingURL=customers.service.js.map