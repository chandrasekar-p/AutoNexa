import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AppointmentStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

// Doubles as the calendar-view query: from/to/status turn the same list
// endpoint into a date-range filter (GET /appointments?from=&to=&status=)
// without a second, colliding route.
export class ListAppointmentsQueryDto {
  @ApiPropertyOptional({ description: 'Free-text search across service type / notes' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ description: 'Date-range filter start (inclusive), e.g. for calendar views' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Date-range filter end (inclusive), e.g. for calendar views' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
