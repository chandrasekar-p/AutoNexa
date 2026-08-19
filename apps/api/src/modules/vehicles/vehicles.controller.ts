import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { ListVehiclesQueryDto } from './dto/list-vehicles-query.dto';
import { AddVehicleDocumentDto } from './dto/add-vehicle-document.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit-log.interceptor';

@ApiBearerAuth()
@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Permissions('vehicle:create')
  @Post()
  @Audit('vehicle.create', 'Vehicle')
  create(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(dto);
  }

  @Permissions('vehicle:read')
  @Get()
  findAll(@Query() query: ListVehiclesQueryDto) {
    return this.vehiclesService.findAll(query);
  }

  @Permissions('vehicle:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Permissions('vehicle:read')
  @Get(':id/service-history')
  getServiceHistory(@Param('id') id: string) {
    return this.vehiclesService.getServiceHistory(id);
  }

  @Permissions('vehicle:update')
  @Patch(':id')
  @Audit('vehicle.update', 'Vehicle')
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, dto);
  }

  @Permissions('vehicle:delete')
  @Delete(':id')
  @Audit('vehicle.delete', 'Vehicle')
  remove(@Param('id') id: string) {
    return this.vehiclesService.remove(id);
  }

  @Permissions('vehicle:update')
  @Post(':id/documents')
  @Audit('vehicle.document.add', 'VehicleDocument')
  addDocument(@Param('id') id: string, @Body() dto: AddVehicleDocumentDto) {
    return this.vehiclesService.addDocument(id, dto);
  }
}
