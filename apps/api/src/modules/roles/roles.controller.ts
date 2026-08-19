import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit-log.interceptor';

@ApiBearerAuth()
@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Permissions('role:read')
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @Permissions('role:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Permissions('role:create')
  @Post()
  @Audit('role.create', 'Role')
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Permissions('role:update')
  @Patch(':id')
  @Audit('role.update', 'Role')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Permissions('role:delete')
  @Delete(':id')
  @Audit('role.delete', 'Role')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
