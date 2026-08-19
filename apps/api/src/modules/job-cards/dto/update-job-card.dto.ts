import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateJobCardDto } from './create-job-card.dto';

// Vehicle/customer aren't reassigned via a plain update (same rule as
// Vehicle → Customer); status changes only through PATCH :id/status, which
// validates the transition and writes a JobCardStatusHistory row — never
// through this general update.
export class UpdateJobCardDto extends PartialType(
  OmitType(CreateJobCardDto, ['vehicleId', 'customerId'] as const),
) {}
