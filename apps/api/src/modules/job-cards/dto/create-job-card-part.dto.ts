import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsUUID, Matches, Min } from 'class-validator';
import { UUID_SHAPE_REGEX, INVALID_UUID_MESSAGE } from '../../../common/validators/uuid-like';

// unitPrice/gstRate/warrantyMonths/warrantyKm are never client-supplied —
// they're snapshotted server-side from the Part at add time (same
// discipline as CreateJobCardLabourDto / LabourItem).
export class CreateJobCardPartDto {
  @ApiProperty()
  @IsUUID()
  partId: string;

  // Decimal(10,3) on Part.currentStock/JobCardPart.quantity — fractional
  // consumption (e.g. 2.750 L of coolant), not just whole pieces.
  @ApiProperty({ example: 2.5 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({ description: 'An open warranty claim on THIS job card that this line is the fix for — makes it non-billable if the claim is approved as free' })
  @IsOptional()
  @Matches(UUID_SHAPE_REGEX, { message: INVALID_UUID_MESSAGE })
  warrantyClaimId?: string;
}
