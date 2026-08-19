import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateVehicleDto } from './create-vehicle.dto';

// A vehicle isn't reassigned to a different customer through a plain
// update — that's a deliberate "transfer ownership" action modeled
// separately once the business rule (e.g. who approves it) is defined.
export class UpdateVehicleDto extends PartialType(OmitType(CreateVehicleDto, ['customerId'] as const)) {}
