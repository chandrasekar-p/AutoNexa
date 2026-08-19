import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobCardStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateJobCardStatusDto {
  @ApiProperty({ enum: JobCardStatus })
  @IsEnum(JobCardStatus)
  status: JobCardStatus;

  @ApiPropertyOptional({ description: 'Recorded on the JobCardStatusHistory row' })
  @IsOptional()
  @IsString()
  notes?: string;
}
