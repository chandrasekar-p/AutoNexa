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
exports.AttendanceService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const date_only_1 = require("./date-only");
const USER_SUMMARY_SELECT = { id: true, name: true };
const RECORD_INCLUDE = {
    user: { select: USER_SUMMARY_SELECT },
    markedBy: { select: USER_SUMMARY_SELECT },
};
let AttendanceService = class AttendanceService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async clockIn(userId) {
        const db = this.prisma.forTenant();
        const today = (0, date_only_1.todayDateOnly)();
        const existing = await db.attendanceRecord.findFirst({ where: { userId, date: today } });
        if (existing?.checkInAt) {
            throw new common_1.BadRequestException('Already clocked in today');
        }
        if (existing) {
            return db.attendanceRecord.update({
                where: { id: existing.id },
                data: { checkInAt: new Date(), status: client_1.AttendanceStatus.PRESENT },
            });
        }
        return db.attendanceRecord.create({
            data: {
                userId,
                date: today,
                checkInAt: new Date(),
                status: client_1.AttendanceStatus.PRESENT,
            },
        });
    }
    async clockOut(userId) {
        const db = this.prisma.forTenant();
        const today = (0, date_only_1.todayDateOnly)();
        const existing = await db.attendanceRecord.findFirst({ where: { userId, date: today } });
        if (!existing?.checkInAt) {
            throw new common_1.BadRequestException('Clock in before clocking out');
        }
        if (existing.checkOutAt) {
            throw new common_1.BadRequestException('Already clocked out today');
        }
        return db.attendanceRecord.update({ where: { id: existing.id }, data: { checkOutAt: new Date() } });
    }
    todayStatus(userId) {
        return this.prisma.forTenant().attendanceRecord.findFirst({ where: { userId, date: (0, date_only_1.todayDateOnly)() } });
    }
    async findOwn(userId, query) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 30;
        const db = this.prisma.forTenant();
        const where = {
            userId,
            ...(query.from || query.to
                ? {
                    date: {
                        ...(query.from ? { gte: (0, date_only_1.dateOnly)(new Date(query.from)) } : {}),
                        ...(query.to ? { lte: (0, date_only_1.dateOnly)(new Date(query.to)) } : {}),
                    },
                }
                : {}),
        };
        const [items, total] = await Promise.all([
            db.attendanceRecord.findMany({ where, orderBy: { date: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
            db.attendanceRecord.count({ where }),
        ]);
        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 30;
        const db = this.prisma.forTenant();
        const where = {
            ...(query.userId ? { userId: query.userId } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.from || query.to
                ? {
                    date: {
                        ...(query.from ? { gte: (0, date_only_1.dateOnly)(new Date(query.from)) } : {}),
                        ...(query.to ? { lte: (0, date_only_1.dateOnly)(new Date(query.to)) } : {}),
                    },
                }
                : {}),
        };
        const [items, total] = await Promise.all([
            db.attendanceRecord.findMany({
                where,
                include: RECORD_INCLUDE,
                orderBy: [{ date: 'desc' }, { user: { name: 'asc' } }],
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.attendanceRecord.count({ where }),
        ]);
        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    async create(dto, markedByUserId) {
        await this.assertUserExists(dto.userId);
        const db = this.prisma.forTenant();
        const date = (0, date_only_1.dateOnly)(new Date(dto.date));
        const existing = await db.attendanceRecord.findFirst({ where: { userId: dto.userId, date } });
        const data = {
            status: dto.status ?? client_1.AttendanceStatus.PRESENT,
            checkInAt: dto.checkInAt ? new Date(dto.checkInAt) : null,
            checkOutAt: dto.checkOutAt ? new Date(dto.checkOutAt) : null,
            notes: dto.notes,
            markedByUserId,
        };
        if (existing) {
            return db.attendanceRecord.update({ where: { id: existing.id }, data, include: RECORD_INCLUDE });
        }
        return db.attendanceRecord.create({
            data: { userId: dto.userId, date, ...data },
            include: RECORD_INCLUDE,
        });
    }
    async update(id, dto, markedByUserId) {
        await this.assertExists(id);
        return this.prisma.forTenant().attendanceRecord.update({
            where: { id },
            data: {
                ...(dto.status !== undefined ? { status: dto.status } : {}),
                ...(dto.checkInAt !== undefined ? { checkInAt: new Date(dto.checkInAt) } : {}),
                ...(dto.checkOutAt !== undefined ? { checkOutAt: new Date(dto.checkOutAt) } : {}),
                ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
                markedByUserId,
            },
            include: RECORD_INCLUDE,
        });
    }
    async remove(id) {
        await this.assertExists(id);
        return this.prisma.forTenant().attendanceRecord.delete({ where: { id } });
    }
    async assertExists(id) {
        const record = await this.prisma.forTenant().attendanceRecord.findFirst({ where: { id } });
        if (!record)
            throw new common_1.NotFoundException('Attendance record not found');
        return record;
    }
    async assertUserExists(userId) {
        const user = await this.prisma.forTenant().user.findFirst({ where: { id: userId, deletedAt: null } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
    }
};
exports.AttendanceService = AttendanceService;
exports.AttendanceService = AttendanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map