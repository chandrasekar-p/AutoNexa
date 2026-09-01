import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { UpdateTenantPlanDto } from './dto/update-tenant-plan.dto';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
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

  // ── Public (pre-auth) ─────────────────────────────────────────────
  // The login screen doesn't know which tenant it's for until the user
  // types the workshop slug, so this has to be reachable with no token.
  // Different literal segment from `me`/`me/settings` below — no route-
  // ordering conflict.
  @Public()
  @Get('branding/:slug')
  getBranding(@Param('slug') slug: string) {
    return this.tenantsService.getBrandingBySlug(slug);
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

  // Any authenticated staff member, not permission-gated — see
  // getTrialStatus()'s own doc comment for why. Two literal segments
  // ('me' + 'trial-status'), so no ordering conflict with the single-
  // segment `:id` route below.
  @Get('me/trial-status')
  getTrialStatus() {
    return this.tenantsService.getTrialStatus();
  }

  // ── Platform-level (Super Admin only), continued ────────────────────
  // Single-segment `:id` routes registered last so they can't shadow the
  // literal `me`/`branding` prefixes above.
  @UseGuards(SuperAdminGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @UseGuards(SuperAdminGuard)
  @Patch(':id/plan')
  @Audit('tenant.plan.update', 'Tenant')
  updatePlan(@Param('id') id: string, @Body() dto: UpdateTenantPlanDto) {
    return this.tenantsService.updatePlan(id, dto);
  }
}
