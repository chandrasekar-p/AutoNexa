import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';
import { UUID_SHAPE_REGEX, INVALID_UUID_MESSAGE } from '../../../common/validators/uuid-like';

// "Exactly one of originalJobCardPartId/originalJobCardLabourId" is a
// cross-field rule class-validator's declarative decorators can't express
// cleanly — checked explicitly in WarrantyClaimsService.create() instead,
// same "business rule lives in the service, not fought into the DTO"
// choice as elsewhere in this codebase.
export class CreateWarrantyClaimDto {
  @ApiProperty({ description: 'The new job card for this comeback visit' })
  @Matches(UUID_SHAPE_REGEX, { message: INVALID_UUID_MESSAGE })
  claimJobCardId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(UUID_SHAPE_REGEX, { message: INVALID_UUID_MESSAGE })
  originalJobCardPartId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(UUID_SHAPE_REGEX, { message: INVALID_UUID_MESSAGE })
  originalJobCardLabourId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}
