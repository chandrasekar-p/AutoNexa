import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateEstimateDto } from './create-estimate.dto';

// Customer/vehicle aren't reassigned via a plain update (same rule as
// Vehicle → Customer); line items are managed through their own endpoints
// so totals stay recalculated in one place (see estimates.service.ts).
export class UpdateEstimateDto extends PartialType(
  OmitType(CreateEstimateDto, ['customerId', 'vehicleId', 'lineItems'] as const),
) {}
