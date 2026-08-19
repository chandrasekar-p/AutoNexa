import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateAppointmentDto } from '../src/modules/appointments/dto/create-appointment.dto';

describe('CreateAppointmentDto validation', () => {
  const validCustomerId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
  const validVehicleId = '3fa85f64-5717-4562-b3fc-2c963f66afa7';

  it('accepts a minimal valid payload', async () => {
    const dto = plainToInstance(CreateAppointmentDto, {
      customerId: validCustomerId,
      vehicleId: validVehicleId,
      serviceType: 'General Service',
      appointmentDate: '2026-08-25',
      appointmentTime: '10:30 AM',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a non-UUID vehicleId', async () => {
    const dto = plainToInstance(CreateAppointmentDto, {
      customerId: validCustomerId,
      vehicleId: 'not-a-uuid',
      serviceType: 'General Service',
      appointmentDate: '2026-08-25',
      appointmentTime: '10:30 AM',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'vehicleId')).toBe(true);
  });

  it('rejects a missing serviceType', async () => {
    const dto = plainToInstance(CreateAppointmentDto, {
      customerId: validCustomerId,
      vehicleId: validVehicleId,
      appointmentDate: '2026-08-25',
      appointmentTime: '10:30 AM',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'serviceType')).toBe(true);
  });

  it('rejects a malformed appointmentDate', async () => {
    const dto = plainToInstance(CreateAppointmentDto, {
      customerId: validCustomerId,
      vehicleId: validVehicleId,
      serviceType: 'General Service',
      appointmentDate: 'not-a-date',
      appointmentTime: '10:30 AM',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'appointmentDate')).toBe(true);
  });

  it('rejects a non-UUID optional technicianId', async () => {
    const dto = plainToInstance(CreateAppointmentDto, {
      customerId: validCustomerId,
      vehicleId: validVehicleId,
      serviceType: 'General Service',
      appointmentDate: '2026-08-25',
      appointmentTime: '10:30 AM',
      technicianId: 'not-a-uuid',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'technicianId')).toBe(true);
  });
});
