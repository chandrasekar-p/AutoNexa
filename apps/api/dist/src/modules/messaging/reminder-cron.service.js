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
const next_service_due_1 = require("./next-service-due");
const reminder_eligibility_1 = require("./reminder-eligibility");
const templates_1 = require("./templates");
const REMINDABLE_STATUSES = [client_1.AppointmentStatus.SCHEDULED, client_1.AppointmentStatus.CONFIRMED];
const DATE_FORMAT = { day: '2-digit', month: 'short', year: 'numeric' };
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
    async sendInsuranceExpiryReminders() {
        await this.sendExpiryReminders('insuranceExpiry', 'vehicle.insurance-expiring', templates_1.insuranceExpiringMessage);
    }
    async sendPucExpiryReminders() {
        await this.sendExpiryReminders('pucExpiry', 'vehicle.puc-expiring', templates_1.pucExpiringMessage);
    }
    async sendExpiryReminders(field, event, buildMessage) {
        const now = new Date();
        const vehicles = await this.prisma.platform.vehicle.findMany({
            where: { deletedAt: null, [field]: { gt: now } },
            include: {
                customer: { select: { id: true, name: true, email: true, mobile: true, reminderOptOut: true } },
                tenant: { select: { id: true, name: true, settings: true } },
            },
        });
        let sentCount = 0;
        for (const vehicle of vehicles) {
            const settings = vehicle.tenant.settings;
            if (!settings)
                continue;
            const enabled = field === 'insuranceExpiry' ? settings.reminderInsuranceEnabled : settings.reminderPucEnabled;
            if (!enabled)
                continue;
            const expiryDate = vehicle[field];
            if (!expiryDate)
                continue;
            for (const thresholdDays of settings.reminderThresholdDays) {
                const dedupeKey = (0, reminder_eligibility_1.buildDateDedupeKey)(vehicle.id, field, expiryDate, thresholdDays);
                const alreadySent = await this.messaging.wasReminded(vehicle.tenantId, event, dedupeKey);
                const eligible = (0, reminder_eligibility_1.shouldSendDateReminder)({
                    optedOut: vehicle.customer.reminderOptOut,
                    enabled,
                    now,
                    targetDate: expiryDate,
                    thresholdDays,
                    alreadySent,
                });
                if (!eligible)
                    continue;
                const content = buildMessage({
                    workshopName: vehicle.tenant.name,
                    customerName: vehicle.customer.name,
                    vehicleLabel: `${vehicle.registrationNo} ${vehicle.brand} ${vehicle.model}`,
                    expiryDate: expiryDate.toLocaleDateString('en-IN', DATE_FORMAT),
                });
                await this.messaging.notifyCustomer(vehicle.tenantId, event, { email: vehicle.customer.email, mobile: vehicle.customer.mobile }, content, { type: 'Vehicle', id: vehicle.id }, undefined, dedupeKey);
                sentCount++;
            }
        }
        this.logger.log(`${sentCount} ${event} reminder(s) sent`);
    }
    async sendServiceDueReminders() {
        const now = new Date();
        const vehicles = await this.prisma.platform.vehicle.findMany({
            where: { deletedAt: null },
            include: {
                customer: { select: { id: true, name: true, email: true, mobile: true, reminderOptOut: true } },
                tenant: { select: { id: true, name: true, settings: true } },
            },
        });
        let sentCount = 0;
        const event = 'vehicle.service-due';
        for (const vehicle of vehicles) {
            const settings = vehicle.tenant.settings;
            if (!settings || !settings.reminderServiceDueEnabled)
                continue;
            const lastService = await this.prisma.platform.jobCard.findFirst({
                where: { vehicleId: vehicle.id, status: client_1.JobCardStatus.DELIVERED, deletedAt: null, actualDelivery: { not: null } },
                orderBy: { actualDelivery: 'desc' },
            });
            if (!lastService?.actualDelivery)
                continue;
            const intervalMonths = vehicle.serviceIntervalMonthsOverride ?? settings.serviceIntervalMonths;
            const intervalKm = vehicle.serviceIntervalKmOverride ?? settings.serviceIntervalKm;
            const { dueDate, dueByOdometer } = (0, next_service_due_1.computeServiceDue)({ completedAt: lastService.actualDelivery, odometer: lastService.odometer }, vehicle.odometerReading, intervalMonths, intervalKm);
            const recipient = { email: vehicle.customer.email, mobile: vehicle.customer.mobile };
            const commonCtx = {
                workshopName: vehicle.tenant.name,
                customerName: vehicle.customer.name,
                vehicleLabel: `${vehicle.registrationNo} ${vehicle.brand} ${vehicle.model}`,
            };
            if (dueDate) {
                for (const thresholdDays of settings.reminderThresholdDays) {
                    const dedupeKey = (0, reminder_eligibility_1.buildDateDedupeKey)(vehicle.id, 'serviceDue', dueDate, thresholdDays);
                    const alreadySent = await this.messaging.wasReminded(vehicle.tenantId, event, dedupeKey);
                    const eligible = (0, reminder_eligibility_1.shouldSendDateReminder)({
                        optedOut: vehicle.customer.reminderOptOut,
                        enabled: settings.reminderServiceDueEnabled,
                        now,
                        targetDate: dueDate,
                        thresholdDays,
                        alreadySent,
                    });
                    if (!eligible)
                        continue;
                    await this.messaging.notifyCustomer(vehicle.tenantId, event, recipient, (0, templates_1.serviceDueMessage)({ ...commonCtx, dueReason: `by ${dueDate.toLocaleDateString('en-IN', DATE_FORMAT)}` }), { type: 'Vehicle', id: vehicle.id }, undefined, dedupeKey);
                    sentCount++;
                }
            }
            if (dueByOdometer && lastService.odometer !== null) {
                const dedupeKey = (0, reminder_eligibility_1.buildOdometerDedupeKey)(vehicle.id, lastService.odometer);
                const alreadySent = await this.messaging.wasReminded(vehicle.tenantId, event, dedupeKey);
                const eligible = (0, reminder_eligibility_1.shouldSendOdometerReminder)({
                    optedOut: vehicle.customer.reminderOptOut,
                    enabled: settings.reminderServiceDueEnabled,
                    dueByOdometer,
                    alreadySent,
                });
                if (eligible) {
                    await this.messaging.notifyCustomer(vehicle.tenantId, event, recipient, (0, templates_1.serviceDueMessage)({ ...commonCtx, dueReason: 'based on your odometer reading' }), { type: 'Vehicle', id: vehicle.id }, undefined, dedupeKey);
                    sentCount++;
                }
            }
        }
        this.logger.log(`${sentCount} service-due reminder(s) sent`);
    }
};
exports.ReminderCronService = ReminderCronService;
__decorate([
    (0, schedule_1.Cron)('0 8 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReminderCronService.prototype, "sendAppointmentReminders", null);
__decorate([
    (0, schedule_1.Cron)('0 8 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReminderCronService.prototype, "sendInsuranceExpiryReminders", null);
__decorate([
    (0, schedule_1.Cron)('0 8 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReminderCronService.prototype, "sendPucExpiryReminders", null);
__decorate([
    (0, schedule_1.Cron)('0 8 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReminderCronService.prototype, "sendServiceDueReminders", null);
exports.ReminderCronService = ReminderCronService = ReminderCronService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        messaging_service_1.MessagingService])
], ReminderCronService);
//# sourceMappingURL=reminder-cron.service.js.map