import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Matches, Min } from 'class-validator';
import { UUID_SHAPE_REGEX, INVALID_UUID_MESSAGE } from '../../../common/validators/uuid-like';

// rate/gstRate/warrantyMonths are never client-supplied — they're
// snapshotted server-side from the LabourItem at add time (see
// job-cards.service.ts).
export class CreateJobCardLabourDto {
  @ApiProperty()
  @IsUUID()
  labourItemId: string;

  @ApiPropertyOptional({ description: 'Override display text for this line' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Defaults to the LabourItem\'s standardHours if omitted' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  hours?: number;

  @ApiPropertyOptional({ description: 'An open warranty claim on THIS job card that this line is the fix for — makes it non-billable if the claim is approved as free' })
  @IsOptional()
  @Matches(UUID_SHAPE_REGEX, { message: INVALID_UUID_MESSAGE })
  warrantyClaimId?: string;
}
