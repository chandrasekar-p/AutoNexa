import { PartialType } from '@nestjs/swagger';
import { CreateEstimateLineItemDto } from './create-estimate-line-item.dto';

export class UpdateEstimateLineItemDto extends PartialType(CreateEstimateLineItemDto) {}
