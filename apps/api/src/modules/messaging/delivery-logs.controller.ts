import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DeliveryLogsService } from './delivery-logs.service';
import { ListDeliveryLogsQueryDto } from './dto/list-delivery-logs-query.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';

// Gated on 'audit-log:read' rather than a new permission resource — this is
// the same "who/what happened and when" visibility as the audit trail, just
// for outbound messages instead of mutations, and reusing it avoids a
// migration to every existing tenant's default role grants.
@ApiBearerAuth()
@ApiTags('messaging')
@Controller('messaging/deliveries')
export class DeliveryLogsController {
  constructor(private readonly deliveryLogsService: DeliveryLogsService) {}

  @Permissions('audit-log:read')
  @Get()
  findAll(@Query() query: ListDeliveryLogsQueryDto) {
    return this.deliveryLogsService.findAll(query);
  }
}
