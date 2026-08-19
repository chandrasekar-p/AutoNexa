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
exports.AppointmentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const CUSTOMER_SUMMARY_SELECT = { id: true, name: true, mobile: true };
const VEHICLE_SUMMARY_SELECT = { id: true, registrationNo: true, brand: true, model: true };
let AppointmentsService = class AppointmentsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        await this.assertCustomerExists(dto.customerId);
        await this.assertVehicleExists(dto.vehicleId);
        return this.prisma.forTenant().appointment.create({
            data: {
                ...dto,
                appointmentDate: new Date(dto.appointmentDate),
            },
        });
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const db = this.prisma.forTenant();
        const where = {
            deletedAt: null,
            ...(query.customerId ? { customerId: query.customerId } : {}),
            ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.from || query.to
                ? {
                    appointmentDate: {
                        ...(query.from ? { gte: new Date(query.from) } : {}),
                        ...(query.to ? { lte: new Date(query.to) } : {}),
                    },
                }
                : {}),
            ...(query.search
                ? {
                    OR: [
                        { serviceType: { contains: query.search, mode: 'insensitive' } },
                        { notes: { contains: query.search, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const [items, total] = await Promise.all([
            db.appointment.findMany({
                where,
                include: { customer: { select: CUSTOMER_SUMMARY_SELECT }, vehicle: { select: VEHICLE_SUMMARY_SELECT } },
                orderBy: { appointmentDate: 'asc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.appointment.count({ where }),
        ]);
        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    async findOne(id) {
        const appointment = await this.prisma.forTenant().appointment.findFirst({
            where: { id, deletedAt: null },
            include: { customer: { select: CUSTOMER_SUMMARY_SELECT }, vehicle: { select: VEHICLE_SUMMARY_SELECT } },
        });
        if (!appointment)
            throw new common_1.NotFoundException('Appointment not found');
        return appointment;
    }
    async update(id, dto) {
        await this.assertExists(id);
        return this.prisma.forTenant().appointment.update({
            where: { id },
            data: {
                ...dto,
                ...(dto.appointmentDate ? { appointmentDate: new Date(dto.appointmentDate) } : {}),
            },
        });
    }
    async remove(id) {
        await this.assertExists(id);
        return this.prisma.forTenant().appointment.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
    async assertExists(id) {
        const appointment = await this.prisma.forTenant().appointment.findFirst({ where: { id, deletedAt: null } });
        if (!appointment)
            throw new common_1.NotFoundException('Appointment not found');
        return appointment;
    }
    async assertCustomerExists(customerId) {
        const customer = await this.prisma.forTenant().customer.findFirst({
            where: { id: customerId, deletedAt: null },
        });
        if (!customer)
            throw new common_1.NotFoundException('Customer not found for this appointment');
    }
    async assertVehicleExists(vehicleId) {
        const vehicle = await this.prisma.forTenant().vehicle.findFirst({
            where: { id: vehicleId, deletedAt: null },
        });
        if (!vehicle)
            throw new common_1.NotFoundException('Vehicle not found for this appointment');
    }
};
exports.AppointmentsService = AppointmentsService;
exports.AppointmentsService = AppointmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AppointmentsService);
//# sourceMappingURL=appointments.service.js.map