import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MessagingService } from './messaging.service';
import { dailyReminderWindow } from './reminder-window';
import { appointmentReminderMessage } from './templates';

const REMINDABLE_STATUSES: AppointmentStatus[] = [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED];

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
}
