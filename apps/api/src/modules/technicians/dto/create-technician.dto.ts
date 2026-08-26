import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

const WORKING_DAY_CODES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export class CreateTechnicianDto {
  @ApiProperty({ description: 'An existing User in this tenant who takes on the Technician role' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ type: [String], example: ['engine', 'electrical'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ example: 'AC Specialist' })
  @IsOptional()
  @IsString()
  specialisation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  experienceYears?: number;

  @ApiPropertyOptional({ description: 'Denominator for the derived workload% — how many concurrent open job cards counts as "full"', default: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxConcurrentJobs?: number;

  @ApiPropertyOptional({ type: [String], enum: WORKING_DAY_CODES, example: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] })
  @IsOptional()
  @IsArray()
  @IsIn(WORKING_DAY_CODES, { each: true })
  workingDays?: string[];

  @ApiPropertyOptional({ example: '09:00 AM', description: 'Free-text time-of-day string, same format the TimePicker UI produces' })
  @IsOptional()
  @IsString()
  workingHoursStart?: string;

  @ApiPropertyOptional({ example: '06:00 PM' })
  @IsOptional()
  @IsString()
  workingHoursEnd?: string;
}
