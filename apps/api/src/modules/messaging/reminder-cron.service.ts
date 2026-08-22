import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AppointmentStatus, JobCardStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MessagingService } from './messaging.service';
import { dailyReminderWindow } from './reminder-window';
import { computeServiceDue } from './next-service-due';
import { buildDateDedupeKey, buildOdometerDedupeKey, shouldSendDateReminder, shouldSendOdometerReminder } from './reminder-eligibility';
import {
  appointmentReminderMessage,
  insuranceExpiringMessage,
  packageExpiringMessage,
  pucExpiringMessage,
  serviceDueMessage,
  MessageContent,
  VehicleReminderTemplateContext,
} from './templates';

const REMINDABLE_STATUSES: AppointmentStatus[] = [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED];

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };

type ExpiryField = 'insuranceExpiry' | 'pucExpiry';

@Injectable()
export class ReminderCronService {
  private readonly logger = new Logger(ReminderCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
  ) {}

  // 08:00 server time daily, across all tenants — see dailyReminderWindow's
  // doc comment for why this is date-only rather than per-timezone/per-hour;
  // uses `platform` (not forTenant()) since a cron tick has no per-request
  // TenantContext to scope from.
  @Cron('0 8 * * *')
  async sendAppointmentReminders(): Promise<void> {
    const { start, end } = dailyReminderWindow(new Date());

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
      const content = appointmentReminderMessage({
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

      await this.messaging.notifyCustomer(
        appointment.tenantId,
        'appointment.reminder',
        { email: appointment.customer.email, mobile: appointment.customer.mobile },
        content,
        { type: 'Appointment', id: appointment.id },
      );

      await this.prisma.platform.appointment.update({
        where: { id: appointment.id },
        data: { reminderSentAt: new Date() },
      });
    }
  }

  @Cron('0 8 * * *')
  async sendInsuranceExpiryReminders(): Promise<void> {
    await this.sendExpiryReminders('insuranceExpiry', 'vehicle.insurance-expiring', insuranceExpiringMessage);
  }

  @Cron('0 8 * * *')
  async sendPucExpiryReminders(): Promise<void> {
    await this.sendExpiryReminders('pucExpiry', 'vehicle.puc-expiring', pucExpiringMessage);
  }

  /**
   * Shared by insurance/PUC — identical rule, different field/message.
   * Fetches every non-deleted vehicle whose tracked date is still in the
   * future (already-expired vehicles are out of scope — this is a heads-up,
   * not an overdue escalation), then checks each of the tenant's configured
   * thresholds independently via reminder-eligibility.ts. A vehicle can
   * receive more than one of these in a single run only if the cron missed
   * enough days to skip past a threshold uncaught — see the architecture
   * doc's reasoning for choosing a cumulative window over an exact-day
   * bucket.
   */
  private async sendExpiryReminders(field: ExpiryField, event: string, buildMessage: (ctx: VehicleReminderTemplateContext) => MessageContent): Promise<void> {
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
      if (!settings) continue;
      const enabled = field === 'insuranceExpiry' ? settings.reminderInsuranceEnabled : settings.reminderPucEnabled;
      if (!enabled) continue;

      const expiryDate = vehicle[field];
      if (!expiryDate) continue;

      for (const thresholdDays of settings.reminderThresholdDays) {
        const dedupeKey = buildDateDedupeKey(vehicle.id, field, expiryDate, thresholdDays);
        const alreadySent = await this.messaging.wasReminded(vehicle.tenantId, event, dedupeKey);
        const eligible = shouldSendDateReminder({
          optedOut: vehicle.customer.reminderOptOut,
          enabled,
          now,
          targetDate: expiryDate,
          thresholdDays,
          alreadySent,
        });
        if (!eligible) continue;

        const content = buildMessage({
          workshopName: vehicle.tenant.name,
          customerName: vehicle.customer.name,
          vehicleLabel: `${vehicle.registrationNo} ${vehicle.brand} ${vehicle.model}`,
          expiryDate: expiryDate.toLocaleDateString('en-IN', DATE_FORMAT),
        });

        await this.messaging.notifyCustomer(
          vehicle.tenantId,
          event,
          { email: vehicle.customer.email, mobile: vehicle.customer.mobile },
          content,
          { type: 'Vehicle', id: vehicle.id },
          undefined,
          dedupeKey,
        );
        sentCount++;
      }
    }

    this.logger.log(`${sentCount} ${event} reminder(s) sent`);
  }

  /**
   * Next-service-due — date trigger (last DELIVERED job card's
   * actualDelivery + interval) checked against the tenant's thresholds like
   * the expiry reminders above, PLUS an independent odometer trigger (see
   * next-service-due.ts) that has no "N days before" concept and simply
   * fires once when already crossed. A vehicle with no completed job card
   * yet has nothing to compute from and is skipped entirely.
   */
  @Cron('0 8 * * *')
  async sendServiceDueReminders(): Promise<void> {
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
      if (!settings || !settings.reminderServiceDueEnabled) continue;

      const lastService = await this.prisma.platform.jobCard.findFirst({
        where: { vehicleId: vehicle.id, status: JobCardStatus.DELIVERED, deletedAt: null, actualDelivery: { not: null } },
        orderBy: { actualDelivery: 'desc' },
      });
      if (!lastService?.actualDelivery) continue;

      const intervalMonths = vehicle.serviceIntervalMonthsOverride ?? settings.serviceIntervalMonths;
      const intervalKm = vehicle.serviceIntervalKmOverride ?? settings.serviceIntervalKm;
      const { dueDate, dueByOdometer } = computeServiceDue(
        { completedAt: lastService.actualDelivery, odometer: lastService.odometer },
        vehicle.odometerReading,
        intervalMonths,
        intervalKm,
      );

      const recipient = { email: vehicle.customer.email, mobile: vehicle.customer.mobile };
      const commonCtx = {
        workshopName: vehicle.tenant.name,
        customerName: vehicle.customer.name,
        vehicleLabel: `${vehicle.registrationNo} ${vehicle.brand} ${vehicle.model}`,
      };

      if (dueDate) {
        for (const thresholdDays of settings.reminderThresholdDays) {
          const dedupeKey = buildDateDedupeKey(vehicle.id, 'serviceDue', dueDate, thresholdDays);
          const alreadySent = await this.messaging.wasReminded(vehicle.tenantId, event, dedupeKey);
          const eligible = shouldSendDateReminder({
            optedOut: vehicle.customer.reminderOptOut,
            enabled: settings.reminderServiceDueEnabled,
            now,
            targetDate: dueDate,
            thresholdDays,
            alreadySent,
          });
          if (!eligible) continue;

          await this.messaging.notifyCustomer(
            vehicle.tenantId,
            event,
            recipient,
            serviceDueMessage({ ...commonCtx, dueReason: `by ${dueDate.toLocaleDateString('en-IN', DATE_FORMAT)}` }),
            { type: 'Vehicle', id: vehicle.id },
            undefined,
            dedupeKey,
          );
          sentCount++;
        }
      }

      if (dueByOdometer && lastService.odometer !== null) {
        const dedupeKey = buildOdometerDedupeKey(vehicle.id, lastService.odometer);
        const alreadySent = await this.messaging.wasReminded(vehicle.tenantId, event, dedupeKey);
        const eligible = shouldSendOdometerReminder({
          optedOut: vehicle.customer.reminderOptOut,
          enabled: settings.reminderServiceDueEnabled,
          dueByOdometer,
          alreadySent,
        });
        if (eligible) {
          await this.messaging.notifyCustomer(
            vehicle.tenantId,
            event,
            recipient,
            serviceDueMessage({ ...commonCtx, dueReason: 'based on your odometer reading' }),
            { type: 'Vehicle', id: vehicle.id },
            undefined,
            dedupeKey,
          );
          sentCount++;
        }
      }
    }

    this.logger.log(`${sentCount} service-due reminder(s) sent`);
  }

  /**
   * Same date-threshold/dedup mechanics as the expiry reminders above,
   * second consumer of that exact module now. No payment link in the
   * message — renewal is a deliberate staff action (create a renewal +
   * invoice, then send that invoice's existing "Send Payment Link" like
   * any other invoice), not something this cron can generate on its own.
   */
  @Cron('0 8 * * *')
  async sendPackageExpiryReminders(): Promise<void> {
    const now = new Date();
    const event = 'package.expiring';

    const packages = await this.prisma.platform.customerServicePackage.findMany({
      where: { status: 'ACTIVE', endDate: { gt: now } },
      include: {
        servicePackage: { select: { name: true } },
        customer: { select: { id: true, name: true, email: true, mobile: true, reminderOptOut: true } },
        vehicle: { select: { registrationNo: true, brand: true, model: true } },
        tenant: { select: { id: true, name: true, settings: true } },
      },
    });

    let sentCount = 0;

    for (const pkg of packages) {
      const settings = pkg.tenant.settings;
      if (!settings || !settings.reminderPackageExpiryEnabled) continue;

      for (const thresholdDays of settings.reminderThresholdDays) {
        const dedupeKey = buildDateDedupeKey(pkg.id, 'packageExpiry', pkg.endDate, thresholdDays);
        const alreadySent = await this.messaging.wasReminded(pkg.tenantId, event, dedupeKey);
        const eligible = shouldSendDateReminder({
          optedOut: pkg.customer.reminderOptOut,
          enabled: settings.reminderPackageExpiryEnabled,
          now,
          targetDate: pkg.endDate,
          thresholdDays,
          alreadySent,
        });
        if (!eligible) continue;

        const content = packageExpiringMessage({
          workshopName: pkg.tenant.name,
          customerName: pkg.customer.name,
          packageName: pkg.servicePackage.name,
          vehicleLabel: `${pkg.vehicle.registrationNo} ${pkg.vehicle.brand} ${pkg.vehicle.model}`,
          expiryDate: pkg.endDate.toLocaleDateString('en-IN', DATE_FORMAT),
        });

        await this.messaging.notifyCustomer(
          pkg.tenantId,
          event,
          { email: pkg.customer.email, mobile: pkg.customer.mobile },
          content,
          { type: 'CustomerServicePackage', id: pkg.id },
          undefined,
          dedupeKey,
        );
        sentCount++;
      }
    }

    this.logger.log(`${sentCount} package-expiring reminder(s) sent`);
  }

  /**
   * Pure hygiene, no notification — the redemption guard
   * (isPackageValidNow) already blocks redeeming a past-endDate package
   * regardless of its stored status, so this doesn't change behavior; it
   * just keeps `status` truthful for reports/filters (packagesSummary's
   * "expired" count would otherwise always read 0 for packages nobody
   * ever touched again after they lapsed).
   */
  @Cron('0 8 * * *')
  async markExpiredPackages(): Promise<void> {
    const result = await this.prisma.platform.customerServicePackage.updateMany({
      where: { status: 'ACTIVE', endDate: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });
    this.logger.log(`${result.count} package(s) marked EXPIRED`);
  }
}
