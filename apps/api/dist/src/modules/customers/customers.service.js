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
const outstanding_1 = require("../../common/billing/outstanding");
let CustomersService = class CustomersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    create(dto) {
        return this.prisma.forTenant().customer.create({
            data: dto,
        });
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const db = this.prisma.forTenant();
        const where = {
            deletedAt: null,
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
        const [items, total] = await Promise.all([
            db.customer.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.customer.count({ where }),
        ]);
        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
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