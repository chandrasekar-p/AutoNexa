import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit-log.interceptor';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiBearerAuth()
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Permissions('user:create')
  @Post()
  @Audit('user.create', 'User')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Permissions('user:read')
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // Registered BEFORE the `:id` routes below, deliberately — Nest/Express
  // match routes in registration order, and `:id` has no ParseUUIDPipe
  // here, so "me" would otherwise be swallowed by findOne/update and
  // wrongly demand user:read/user:update just to see or edit your own
  // profile. Same route-ordering lesson as elsewhere in this codebase.
  @Get('me')
  getOwnProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findOwnProfile(user.userId);
  }

  @Patch('me')
  @Audit('user.update-own-profile', 'User')
  updateOwnProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateOwnProfileDto) {
    return this.usersService.updateOwnProfile(user.userId, dto);
  }

  @Permissions('user:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Permissions('user:update')
  @Patch(':id')
  @Audit('user.update', 'User')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Permissions('user:delete')
  @Delete(':id')
  @Audit('user.deactivate', 'User')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  // Any authenticated user can change their own password — no special
  // permission required, but it's still tenant-scoped via forTenant().
  @Patch('me/password')
  changeOwnPassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.usersService.changeOwnPassword(user.userId, dto);
  }
}
