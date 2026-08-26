import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TechniciansService } from './technicians.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';
import { ListTechniciansQueryDto } from './dto/list-technicians-query.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit-log.interceptor';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiBearerAuth()
@ApiTags('technicians')
@Controller('technicians')
export class TechniciansController {
  constructor(private readonly techniciansService: TechniciansService) {}

  @Permissions('technician:create')
  @Post()
  @Audit('technician.create', 'Technician')
  create(@Body() dto: CreateTechnicianDto) {
    return this.techniciansService.create(dto);
  }

  @Permissions('technician:read')
  @Get()
  findAll(@Query() query: ListTechniciansQueryDto) {
    return this.techniciansService.findAll(query);
  }

  // Registered before Get(':id') — otherwise ':id' would swallow the
  // literal 'summary'/'me' segments (see CLAUDE.md's route-ordering note).
  @Permissions('technician:read')
  @Get('summary')
  summary() {
    return this.techniciansService.summary();
  }

  // No @Permissions guard — self-view only (resolved from the caller's own
  // userId), same pattern as GET /attendance/me. Lets a Technician-role
  // user see their own profile without a blanket technician:read grant
  // that would also expose every other technician's data to them.
  @Get('me')
  findOwn(@CurrentUser() user: AuthenticatedUser) {
    return this.techniciansService.findByUserId(user.userId);
  }

  @Permissions('technician:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.techniciansService.findOne(id);
  }

  @Permissions('technician:update')
  @Patch(':id')
  @Audit('technician.update', 'Technician')
  update(@Param('id') id: string, @Body() dto: UpdateTechnicianDto) {
    return this.techniciansService.update(id, dto);
  }
}
