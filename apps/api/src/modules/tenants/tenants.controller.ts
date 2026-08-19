import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit-log.interceptor';

@ApiBearerAuth()
@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  // ── Platform-level (Super Admin only) ──────────────────────────────
  @UseGuards(SuperAdminGuard)
  @Post()
  @Audit('tenant.create', 'Tenant')
  provisionTenant(@Body() dto: CreateTenantDto) {
    return this.tenantsService.provisionTenant(dto);
  }

  @UseGuards(SuperAdminGuard)
  @Get()
  listAll() {
    return this.tenantsService.listAll();
  }

  // ── Self-service (any authenticated workshop user with permission) ──
  @Permissions('tenant:read')
  @Get('me')
  getCurrentTenant() {
    return this.tenantsService.getCurrentTenant();
  }

  @Permissions('settings:update')
  @Patch('me/settings')
  @Audit('tenant.settings.update', 'TenantSettings')
  updateSettings(@Body() dto: UpdateTenantSettingsDto) {
    return this.tenantsService.updateSettings(dto);
  }
}
