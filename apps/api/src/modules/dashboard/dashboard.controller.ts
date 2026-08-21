import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

// Deliberately no @Permissions() — the dashboard is the universal landing
// page every role sees after login (NAV_ITEMS gates it on `resource: null`,
// i.e. always visible), so it can't require `report:read` at the route
// level: Technician and Receptionist don't get that grant by default (see
// default-role-grants.ts), which made this 403 for them outright and left
// their dashboard permanently broken. Same "no gate, self-service basics"
// reasoning as GET /users/me and GET /notifications/alerts — the money
// fields specifically (pending payments, sales, revenue) are instead
// redacted field-by-field inside the service based on the same report:read
// grant, not blocked at the route.
@ApiBearerAuth()
@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser) {
    const canViewFinancials = user.isSuperAdmin || user.permissions.includes('report:read');
    return this.dashboardService.summary(canViewFinancials);
  }
}
