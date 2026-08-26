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
const technician_performance_1 = require("./technician-performance");
const technician_workload_1 = require("./technician-workload");
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
        const openJobCardFilter = { status: { notIn: TERMINAL_STATUSES }, deletedAt: null };
        const where = {
            ...(query.status ? { status: query.status } : {}),
            ...(query.specialisation ? { specialisation: query.specialisation } : {}),
            ...(query.skill ? { skills: { has: query.skill } } : {}),
            ...(query.workload === 'available'
                ? { status: 'ACTIVE', jobCards: { none: openJobCardFilter } }
                : query.workload === 'busy'
                    ? { status: 'ACTIVE', jobCards: { some: openJobCardFilter } }
                    : {}),
            ...(query.search
                ? {
                    OR: [
                        { employeeId: { contains: query.search, mode: 'insensitive' } },
                        { specialisation: { contains: query.search, mode: 'insensitive' } },
                        { user: { name: { contains: query.search, mode: 'insensitive' } } },
                        { skills: { has: query.search } },
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
        const ids = items.map((t) => t.id);
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
        const [openCounts, todayCounts] = await Promise.all([
            ids.length > 0
                ? db.jobCard.groupBy({ by: ['technicianId'], where: { technicianId: { in: ids }, ...openJobCardFilter }, _count: true })
                : Promise.resolve([]),
            ids.length > 0
                ? db.jobCard.groupBy({
                    by: ['technicianId'],
                    where: { technicianId: { in: ids }, deletedAt: null, updatedAt: { gte: todayStart, lt: todayEnd } },
                    _count: true,
                })
                : Promise.resolve([]),
        ]);
        const openById = new Map(openCounts.map((c) => [c.technicianId, c._count]));
        const todayById = new Map(todayCounts.map((c) => [c.technicianId, c._count]));
        return {
            items: items.map((t) => {
                const jobsOpen = openById.get(t.id) ?? 0;
                return {
                    ...t,
                    jobsOpen,
                    todayCount: todayById.get(t.id) ?? 0,
                    workloadPercent: (0, technician_workload_1.computeWorkloadPercent)(jobsOpen, t.maxConcurrentJobs),
                    availability: (0, technician_workload_1.deriveTechnicianAvailability)(t.status, jobsOpen),
                };
            }),
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }
    async summary() {
        const db = this.prisma.forTenant();
        const technicians = await db.technician.findMany({ select: { id: true, status: true } });
        const ids = technicians.map((t) => t.id);
        const openCounts = ids.length > 0
            ? await db.jobCard.groupBy({
                by: ['technicianId'],
                where: { technicianId: { in: ids }, status: { notIn: TERMINAL_STATUSES }, deletedAt: null },
                _count: true,
            })
            : [];
        const openById = new Map(openCounts.map((c) => [c.technicianId, c._count]));
        let active = 0;
        let available = 0;
        let onJob = 0;
        let onLeave = 0;
        let inactive = 0;
        for (const t of technicians) {
            if (t.status === 'ACTIVE')
                active++;
            const availability = (0, technician_workload_1.deriveTechnicianAvailability)(t.status, openById.get(t.id) ?? 0);
            if (availability === 'AVAILABLE')
                available++;
            else if (availability === 'ON_JOB')
                onJob++;
            else if (availability === 'ON_LEAVE')
                onLeave++;
            else
                inactive++;
        }
        return { active, available, onJob, onLeave, inactive };
    }
    async findByUserId(userId) {
        const technician = await this.prisma.forTenant().technician.findFirst({
            where: { userId },
            include: { user: { select: USER_SUMMARY_SELECT } },
        });
        if (!technician)
            throw new common_1.NotFoundException('No technician profile for this user');
        return this.withDerivedFields(technician);
    }
    async findOne(id) {
        const technician = await this.assertExists(id);
        return this.withDerivedFields(technician);
    }
    async withDerivedFields(technician) {
        const db = this.prisma.forTenant();
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
        const [performance, todayCount] = await Promise.all([
            (0, technician_performance_1.computeTechnicianPerformance)(db, technician.id),
            db.jobCard.count({ where: { technicianId: technician.id, deletedAt: null, updatedAt: { gte: todayStart, lt: todayEnd } } }),
        ]);
        return {
            ...technician,
            ...performance,
            todayCount,
            workloadPercent: (0, technician_workload_1.computeWorkloadPercent)(performance.jobsOpen, technician.maxConcurrentJobs),
            availability: (0, technician_workload_1.deriveTechnicianAvailability)(technician.status, performance.jobsOpen),
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