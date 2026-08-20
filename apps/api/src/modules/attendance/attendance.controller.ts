import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceRecordDto } from './dto/create-attendance-record.dto';
import { UpdateAttendanceRecordDto } from './dto/update-attendance-record.dto';
import { ListAttendanceQueryDto } from './dto/list-attendance-query.dto';
import { ListOwnAttendanceQueryDto } from './dto/list-own-attendance-query.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Audit } from '../../common/interceptors/audit-log.interceptor';

// Literal routes (clock-in, clock-out, me, me/today) are registered before
// the :id routes below — Nest/Express match in registration order and this
// app doesn't use ParseUUIDPipe, so :id would otherwise swallow them.
@ApiBearerAuth()
@ApiTags('attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // Self-service, no permission gate — every authenticated user clocks
  // their own attendance in/out, same as changeOwnPassword/updateOwnProfile.
  @Post('clock-in')
  @Audit('attendance.clock-in', 'AttendanceRecord')
  clockIn(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.clockIn(user.userId);
  }

  @Post('clock-out')
  @Audit('attendance.clock-out', 'AttendanceRecord')
  clockOut(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.clockOut(user.userId);
  }

  @Get('me')
  findOwn(@CurrentUser() user: AuthenticatedUser, @Query() query: ListOwnAttendanceQueryDto) {
    return this.attendanceService.findOwn(user.userId, query);
  }

  @Get('me/today')
  todayStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.todayStatus(user.userId);
  }

  @Permissions('attendance:read')
  @Get()
  findAll(@Query() query: ListAttendanceQueryDto) {
    return this.attendanceService.findAll(query);
  }

  @Permissions('attendance:create')
  @Post()
  @Audit('attendance.mark', 'AttendanceRecord')
  create(@Body() dto: CreateAttendanceRecordDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.create(dto, user.userId);
  }

  @Permissions('attendance:update')
  @Patch(':id')
  @Audit('attendance.correct', 'AttendanceRecord')
  update(@Param('id') id: string, @Body() dto: UpdateAttendanceRecordDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.update(id, dto, user.userId);
  }

  @Permissions('attendance:delete')
  @Delete(':id')
  @Audit('attendance.delete', 'AttendanceRecord')
  remove(@Param('id') id: string) {
    return this.attendanceService.remove(id);
  }
}
