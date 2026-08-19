import { PartialType } from '@nestjs/swagger';
import { CreateLabourItemDto } from './create-labour-item.dto';

export class UpdateLabourItemDto extends PartialType(CreateLabourItemDto) {}
