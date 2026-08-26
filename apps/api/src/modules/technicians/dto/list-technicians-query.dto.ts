import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TechnicianStatus } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListTechniciansQueryDto {
  @ApiPropertyOptional({ description: 'Free-text search across technician name, employee ID, specialisation, and an exact skill match' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: TechnicianStatus })
  @IsOptional()
  @IsEnum(TechnicianStatus)
  status?: TechnicianStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialisation?: string;

  @ApiPropertyOptional({ description: 'Exact skill match (Technician.skills is a scalar list — no substring search)' })
  @IsOptional()
  @IsString()
  skill?: string;

  @ApiPropertyOptional({ enum: ['available', 'busy'], description: 'Restricts to ACTIVE technicians with zero (available) or at least one (busy) open job card — see deriveTechnicianAvailability' })
  @IsOptional()
  @IsIn(['available', 'busy'])
  workload?: 'available' | 'busy';

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
