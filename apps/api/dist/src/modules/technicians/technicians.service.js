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
exports.TechniciansService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const USER_SUMMARY_SELECT = { id: true, name: true, email: true, phone: true };
const TERMINAL_STATUSES = [client_1.JobCardStatus.DELIVERED, client_1.JobCardStatus.CANCELLED];
let TechniciansService = class TechniciansService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        await this.assertUserExists(dto.userId);
        await this.assertUserNotAlreadyTechnician(dto.userId);
        return this.prisma.forTenant().technician.create({
            data: dto,
        });
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const db = this.prisma.forTenant();
        const where = {
            ...(query.status ? { status: query.status } : {}),
            ...(query.search
                ? {
                    OR: [
                        { employeeId: { contains: query.search, mode: 'insensitive' } },
                        { specialisation: { contains: query.search, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const [items, total] = await Promise.all([
            db.technician.findMany({
                where,
                include: { user: { select: USER_SUMMARY_SELECT } },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.technician.count({ where }),
        ]);
        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    async findOne(id) {
        const technician = await this.assertExists(id);
        const db = this.prisma.forTenant();
        const [jobsOpen, jobsCompleted, hoursAgg, revenueAgg] = await Promise.all([
            db.jobCard.count({
                where: { technicianId: id, deletedAt: null, status: { notIn: TERMINAL_STATUSES } },
            }),
            db.jobCard.count({ where: { technicianId: id, deletedAt: null, status: client_1.JobCardStatus.DELIVERED } }),
            db.jobCardLabour.aggregate({ where: { jobCard: { technicianId: id } }, _sum: { hours: true } }),
            db.jobCardLabour.aggregate({
                where: { jobCard: { technicianId: id, invoice: { status: client_1.InvoiceStatus.PAID } } },
                _sum: { lineTotal: true },
            }),
        ]);
        return {
            ...technician,
            jobsOpen,
            jobsCompleted,
            totalLabourHours: hoursAgg._sum.hours ?? new client_1.Prisma.Decimal(0),
            revenueGenerated: revenueAgg._sum.lineTotal ?? new client_1.Prisma.Decimal(0),
        };
    }
    async update(id, dto) {
        await this.assertExists(id);
        return this.prisma.forTenant().technician.update({ where: { id }, data: dto });
    }
    async assertExists(id) {
        const technician = await this.prisma.forTenant().technician.findFirst({
            where: { id },
            include: { user: { select: USER_SUMMARY_SELECT } },
        });
        if (!technician)
            throw new common_1.NotFoundException('Technician not found');
        return technician;
    }
    async assertUserExists(userId) {
        const user = await this.prisma.forTenant().user.findFirst({ where: { id: userId, deletedAt: null } });
        if (!user)
            throw new common_1.NotFoundException('User not found for this technician');
    }
    async assertUserNotAlreadyTechnician(userId) {
        const existing = await this.prisma.forTenant().technician.findFirst({ where: { userId } });
        if (existing)
            throw new common_1.ConflictException('This user is already a technician');
    }
};
exports.TechniciansService = TechniciansService;
exports.TechniciansService = TechniciansService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TechniciansService);
//# sourceMappingURL=technicians.service.js.map