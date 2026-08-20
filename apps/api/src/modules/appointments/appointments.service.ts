import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../prisma/tenant-context';
import { MessagingService } from '../messaging/messaging.service';
import { appointmentConfirmedMessage } from '../messaging/templates';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';

const CUSTOMER_SUMMARY_SELECT = { id: true, name: true, mobile: true, email: true } as const;
const VEHICLE_SUMMARY_SELECT = { id: true, registrationNo: true, brand: true, model: true } as const;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
  ) {}

  // Cast needed because forTenant() injects tenantId into `data` at
  // runtime (see PrismaService) — the generated create type can't see that.
  async create(dto: CreateAppointmentDto) {
    await this.assertCustomerExists(dto.customerId);
    await this.assertVehicleExists(dto.vehicleId);

    const appointment = await this.prisma.forTenant().appointment.create({
      data: {
        ...dto,
        appointmentDate: new Date(dto.appointmentDate),
      } as unknown as Prisma.AppointmentUncheckedCreateInput,
      include: { customer: { select: CUSTOMER_SUMMARY_SELECT }, vehicle: { select: VEHICLE_SUMMARY_SELECT } },
    });

    await this.sendConfirmation(appointment);

    return appointment;
  }

  /** Best-effort — see MessagingService.notifyCustomer's doc comment on why this never throws. */
  private async sendConfirmation(appointment: {
    id: string;
    serviceType: string;
    appointmentDate: Date;
    appointmentTime: string;
    customer: { name: string; mobile: string; email: string | null };
    vehicle: { registrationNo: string; brand: string; model: string };
  }) {
    const tenantId = TenantContext.requireTenantId();
    const tenant = await this.prisma.platform.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });

    const content = appointmentConfirmedMessage({
      workshopName: tenant?.name ?? 'AutoNexa',
      customerName: appointment.customer.name,
      vehicleLabel: `${appointment.vehicle.registrationNo} ${appointment.vehicle.brand} ${appointment.vehicle.model}`,
      serviceType: appointment.serviceType,
      appointmentDate: appointment.appointmentDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      appointmentTime: appointment.appointmentTime,
    });

    await this.messaging.notifyCustomer(
      tenantId,
      'appointment.confirmed',
      { email: appointment.customer.email, mobile: appointment.customer.mobile },
      content,
      { type: 'Appointment', id: appointment.id },
    );

    await this.messaging.notifyOps(
      tenantId,
      'appointment.confirmed',
      `New appointment: ${appointment.customer.name} — ${appointment.vehicle.registrationNo} — ${appointment.appointmentTime}`,
      { type: 'Appointment', id: appointment.id },
    );
  }

  async findAll(query: ListAppointmentsQueryDto) {
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
              { serviceType: { contains: query.search, mode: 'insensitive' as const } },
              { notes: { contains: query.search, mode: 'insensitive' as const } },
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

  async findOne(id: string) {
    const appointment = await this.prisma.forTenant().appointment.findFirst({
      where: { id, deletedAt: null },
      include: { customer: { select: CUSTOMER_SUMMARY_SELECT }, vehicle: { select: VEHICLE_SUMMARY_SELECT } },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  async update(id: string, dto: UpdateAppointmentDto) {
    await this.assertExists(id);
    return this.prisma.forTenant().appointment.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.appointmentDate ? { appointmentDate: new Date(dto.appointmentDate) } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.assertExists(id);
    return this.prisma.forTenant().appointment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async assertExists(id: string) {
    const appointment = await this.prisma.forTenant().appointment.findFirst({ where: { id, deletedAt: null } });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  private async assertCustomerExists(customerId: string) {
    const customer = await this.prisma.forTenant().customer.findFirst({
      where: { id: customerId, deletedAt: null },
    });
    if (!customer) throw new NotFoundException('Customer not found for this appointment');
  }

  private async assertVehicleExists(vehicleId: string) {
    const vehicle = await this.prisma.forTenant().vehicle.findFirst({
      where: { id: vehicleId, deletedAt: null },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found for this appointment');
  }
}
