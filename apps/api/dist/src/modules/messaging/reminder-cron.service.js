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
var ReminderCronService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReminderCronService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const messaging_service_1 = require("./messaging.service");
const reminder_window_1 = require("./reminder-window");
const templates_1 = require("./templates");
const REMINDABLE_STATUSES = [client_1.AppointmentStatus.SCHEDULED, client_1.AppointmentStatus.CONFIRMED];
let ReminderCronService = ReminderCronService_1 = class ReminderCronService {
    constructor(prisma, messaging) {
        this.prisma = prisma;
        this.messaging = messaging;
        this.logger = new common_1.Logger(ReminderCronService_1.name);
    }
    async sendAppointmentReminders() {
        const { start, end } = (0, reminder_window_1.dailyReminderWindow)(new Date());
        const appointments = await this.prisma.platform.appointment.findMany({
            where: {
                deletedAt: null,
                status: { in: REMINDABLE_STATUSES },
                reminderSentAt: null,
                appointmentDate: { gte: start, lt: end },
            },
            include: {
                customer: { select: { id: true, name: true, email: true, mobile: true } },
                vehicle: { select: { id: true, registrationNo: true, brand: true, model: true } },
                tenant: { select: { id: true, name: true } },
            },
        });
        this.logger.log(`${appointments.length} appointment(s) due for a reminder`);
        for (const appointment of appointments) {
            const content = (0, templates_1.appointmentReminderMessage)({
                workshopName: appointment.tenant.name,
                customerName: appointment.customer.name,
                vehicleLabel: `${appointment.vehicle.registrationNo} ${appointment.vehicle.brand} ${appointment.vehicle.model}`,
                serviceType: appointment.serviceType,
                appointmentDate: appointment.appointmentDate.toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                }),
                appointmentTime: appointment.appointmentTime,
            });
            await this.messaging.notifyCustomer(appointment.tenantId, 'appointment.reminder', { email: appointment.customer.email, mobile: appointment.customer.mobile }, content, { type: 'Appointment', id: appointment.id });
            await this.prisma.platform.appointment.update({
                where: { id: appointment.id },
                data: { reminderSentAt: new Date() },
            });
        }
    }
};
exports.ReminderCronService = ReminderCronService;
__decorate([
    (0, schedule_1.Cron)('0 8 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReminderCronService.prototype, "sendAppointmentReminders", null);
exports.ReminderCronService = ReminderCronService = ReminderCronService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        messaging_service_1.MessagingService])
], ReminderCronService);
//# sourceMappingURL=reminder-cron.service.js.map