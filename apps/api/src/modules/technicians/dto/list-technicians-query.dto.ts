import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TechnicianStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListTechniciansQueryDto {
  @ApiPropertyOptional({ description: 'Free-text search across employee ID and specialisation' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: TechnicianStatus })
  @IsOptional()
  @IsEnum(TechnicianStatus)
  status?: TechnicianStatus;

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
