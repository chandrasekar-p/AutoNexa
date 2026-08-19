import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { InspectionStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateInspectionDto } from './create-inspection.dto';

// A vehicle isn't reassigned through a plain update — same rule as the
// other Phase 3/4 modules.
export class UpdateInspectionDto extends PartialType(OmitType(CreateInspectionDto, ['vehicleId'] as const)) {
  @ApiPropertyOptional({ enum: InspectionStatus })
  @IsOptional()
  @IsEnum(InspectionStatus)
  status?: InspectionStatus;
}
