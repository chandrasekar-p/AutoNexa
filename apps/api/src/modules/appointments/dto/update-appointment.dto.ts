import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateAppointmentDto } from './create-appointment.dto';

// A booking isn't reassigned to a different customer/vehicle through a
// plain update — same rule as Vehicle → Customer.
export class UpdateAppointmentDto extends PartialType(
  OmitType(CreateAppointmentDto, ['customerId', 'vehicleId'] as const),
) {
  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;
}
