import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Matches, NotEquals } from 'class-validator';
import { UUID_SHAPE_REGEX, INVALID_UUID_MESSAGE } from '../../../common/validators/uuid-like';

export class AdjustLoyaltyPointsDto {
  @ApiProperty()
  @Matches(UUID_SHAPE_REGEX, { message: INVALID_UUID_MESSAGE })
  customerId: string;

  @ApiProperty({ description: 'Positive to add points (goodwill), negative to remove (correction) — never zero', example: 50 })
  @IsInt()
  @NotEquals(0)
  points: number;

  @ApiProperty({ description: 'Required — why this manual correction was made, shown on the ledger' })
  @IsString()
  @IsNotEmpty()
  note: string;
}
