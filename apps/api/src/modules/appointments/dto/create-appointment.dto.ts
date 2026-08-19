import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiProperty()
  @IsUUID()
  vehicleId: string;

  @ApiProperty({ example: 'General Service' })
  @IsString()
  @IsNotEmpty()
  serviceType: string;

  @ApiProperty({ example: '2026-08-25' })
  @IsDateString()
  appointmentDate: string;

  @ApiProperty({ example: '10:30 AM' })
  @IsString()
  @IsNotEmpty()
  appointmentTime: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serviceAdvisorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  technicianId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
