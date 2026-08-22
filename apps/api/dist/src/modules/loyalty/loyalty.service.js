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
exports.LoyaltyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const loyalty_ledger_1 = require("./loyalty-ledger");
let LoyaltyService = class LoyaltyService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getBalance(customerId) {
        const customer = await this.prisma.forTenant().customer.findFirst({
            where: { id: customerId, deletedAt: null },
            select: { id: true, name: true, loyaltyPointsBalance: true },
        });
        if (!customer)
            throw new common_1.NotFoundException('Customer not found');
        return { customerId: customer.id, customerName: customer.name, balance: customer.loyaltyPointsBalance };
    }
    async listTransactions(query) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const db = this.prisma.forTenant();
        const where = { ...(query.customerId ? { customerId: query.customerId } : {}) };
        const [items, total] = await Promise.all([
            db.loyaltyTransaction.findMany({
                where,
                include: { customer: { select: { id: true, name: true } }, adjustedByUser: { select: { id: true, name: true } } },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.loyaltyTransaction.count({ where }),
        ]);
        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    async adjust(dto, adjustedByUserId) {
        const db = this.prisma.forTenant();
        const customer = await db.customer.findFirst({ where: { id: dto.customerId, deletedAt: null } });
        if (!customer)
            throw new common_1.NotFoundException('Customer not found');
        await db.$transaction(async (tx) => {
            await (0, loyalty_ledger_1.adjustLoyaltyBalance)(tx, dto.customerId, dto.points, {
                invoiceId: null,
                type: 'ADJUSTED',
                note: dto.note,
                adjustedByUserId,
            });
        });
        return this.getBalance(dto.customerId);
    }
};
exports.LoyaltyService = LoyaltyService;
exports.LoyaltyService = LoyaltyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LoyaltyService);
//# sourceMappingURL=loyalty.service.js.map