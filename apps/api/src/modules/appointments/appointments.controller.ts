import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit-log.interceptor';

@ApiBearerAuth()
@ApiTags('appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Permissions('appointment:create')
  @Post()
  @Audit('appointment.create', 'Appointment')
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(dto);
  }

  @Permissions('appointment:read')
  @Get()
  findAll(@Query() query: ListAppointmentsQueryDto) {
    return this.appointmentsService.findAll(query);
  }

  @Permissions('appointment:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Permissions('appointment:update')
  @Patch(':id')
  @Audit('appointment.update', 'Appointment')
  update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.appointmentsService.update(id, dto);
  }

  @Permissions('appointment:delete')
  @Delete(':id')
  @Audit('appointment.delete', 'Appointment')
  remove(@Param('id') id: string) {
    return this.appointmentsService.remove(id);
  }
}
