import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { AlertsQueryDto } from './dto/alerts-query.dto';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

// Notifications are personal to the requesting user, not a business
// resource — no @Permissions() here by design; any authenticated tenant
// user can list/mark-read their own (+ broadcast) notifications.
@ApiBearerAuth()
@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListNotificationsQueryDto) {
    return this.notificationsService.findAll(user.userId, query);
  }

  @Get('alerts')
  getAlerts(@Query() query: AlertsQueryDto) {
    return this.notificationsService.getAlerts(query);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markRead(id, user.userId);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllRead(user.userId);
  }
}
