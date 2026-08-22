import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';
import { UUID_SHAPE_REGEX, INVALID_UUID_MESSAGE } from '../../../common/validators/uuid-like';

export class SellServicePackageDto {
  @ApiProperty()
  @Matches(UUID_SHAPE_REGEX, { message: INVALID_UUID_MESSAGE })
  servicePackageId: string;

  @ApiProperty()
  @Matches(UUID_SHAPE_REGEX, { message: INVALID_UUID_MESSAGE })
  customerId: string;

  @ApiProperty()
  @Matches(UUID_SHAPE_REGEX, { message: INVALID_UUID_MESSAGE })
  vehicleId: string;
}
