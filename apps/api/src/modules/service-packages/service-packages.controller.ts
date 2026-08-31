import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ServicePackagesService } from './service-packages.service';
import { CreateServicePackageDto } from './dto/create-service-package.dto';
import { UpdateServicePackageDto } from './dto/update-service-package.dto';
import { ListServicePackagesQueryDto } from './dto/list-service-packages-query.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit-log.interceptor';

// The tenant-defined catalogue (templates) — selling one to a specific
// customer+vehicle is CustomerServicePackagesController, a separate
// controller in this same module.
@ApiBearerAuth()
@ApiTags('service-packages')
@Controller('service-packages')
export class ServicePackagesController {
  constructor(private readonly servicePackagesService: ServicePackagesService) {}

  @Permissions('service-package:create')
  @Post()
  @Audit('service-package.create', 'ServicePackage')
  create(@Body() dto: CreateServicePackageDto) {
    return this.servicePackagesService.create(dto);
  }

  @Permissions('service-package:read')
  @Get()
  findAll(@Query() query: ListServicePackagesQueryDto) {
    return this.servicePackagesService.findAll(query);
  }

  @Permissions('service-package:read')
  @Get('summary')
  summary() {
    return this.servicePackagesService.summary();
  }

  @Permissions('service-package:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.servicePackagesService.findOne(id);
  }

  @Permissions('service-package:update')
  @Patch(':id')
  @Audit('service-package.update', 'ServicePackage')
  update(@Param('id') id: string, @Body() dto: UpdateServicePackageDto) {
    return this.servicePackagesService.update(id, dto);
  }

  @Permissions('service-package:delete')
  @Delete(':id')
  @Audit('service-package.delete', 'ServicePackage')
  remove(@Param('id') id: string) {
    return this.servicePackagesService.remove(id);
  }
}
