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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const low_stock_1 = require("../parts/low-stock");
const NON_TERMINAL_JOB_CARD_STATUSES = Object.values(client_1.JobCardStatus).filter((s) => s !== client_1.JobCardStatus.DELIVERED && s !== client_1.JobCardStatus.CANCELLED);
let NotificationsService = class NotificationsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(userId, query) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const db = this.prisma.forTenant();
        const where = {
            OR: [{ userId }, { userId: null }],
            ...(query.isRead !== undefined ? { isRead: query.isRead } : {}),
        };
        const [items, total] = await Promise.all([
            db.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.notification.count({ where }),
        ]);
        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    async markRead(id, userId) {
        const notification = await this.prisma.forTenant().notification.findFirst({
            where: { id, OR: [{ userId }, { userId: null }] },
        });
        if (!notification)
            throw new common_1.NotFoundException('Notification not found');
        return this.prisma.forTenant().notification.update({
            where: { id },
            data: { isRead: true },
        });
    }
    async markAllRead(userId) {
        const result = await this.prisma.forTenant().notification.updateMany({
            where: { OR: [{ userId }, { userId: null }], isRead: false },
            data: { isRead: true },
        });
        return { markedRead: result.count };
    }
    async getAlerts(query) {
        const days = query.days ?? 30;
        const db = this.prisma.forTenant();
        const now = new Date();
        const expiryHorizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        const [parts, expiringVehicles, delayedJobCards] = await Promise.all([
            db.part.findMany({ where: { deletedAt: null, isActive: true } }),
            db.vehicle.findMany({
                where: {
                    deletedAt: null,
                    OR: [
                        { insuranceExpiry: { gte: now, lte: expiryHorizon } },
                        { pucExpiry: { gte: now, lte: expiryHorizon } },
                    ],
                },
                include: { customer: { select: { id: true, name: true, mobile: true } } },
            }),
            db.jobCard.findMany({
                where: {
                    deletedAt: null,
                    expectedDelivery: { lt: now },
                    status: { in: NON_TERMINAL_JOB_CARD_STATUSES },
                },
                include: {
                    vehicle: { select: { id: true, registrationNo: true, brand: true, model: true } },
                    customer: { select: { id: true, name: true, mobile: true } },
                },
            }),
        ]);
        return {
            lowStockParts: parts.filter(low_stock_1.isLowStock),
            expiringDocuments: expiringVehicles.map((v) => ({
                vehicleId: v.id,
                registrationNo: v.registrationNo,
                customer: v.customer,
                insuranceExpiry: v.insuranceExpiry,
                pucExpiry: v.pucExpiry,
            })),
            delayedJobCards: delayedJobCards.map((jc) => ({
                jobCardId: jc.id,
                jobCardNumber: jc.jobCardNumber,
                vehicle: jc.vehicle,
                customer: jc.customer,
                status: jc.status,
                expectedDelivery: jc.expectedDelivery,
            })),
        };
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map