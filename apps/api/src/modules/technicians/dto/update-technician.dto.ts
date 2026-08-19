import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { TechnicianStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateTechnicianDto } from './create-technician.dto';

// A technician profile isn't re-pointed at a different user identity
// through a plain update — same rule as Vehicle → Customer.
export class UpdateTechnicianDto extends PartialType(OmitType(CreateTechnicianDto, ['userId'] as const)) {
  @ApiPropertyOptional({ enum: TechnicianStatus })
  @IsOptional()
  @IsEnum(TechnicianStatus)
  status?: TechnicianStatus;
}
