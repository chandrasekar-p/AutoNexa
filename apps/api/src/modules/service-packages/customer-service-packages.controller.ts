import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CustomerServicePackagesService } from './customer-service-packages.service';
import { SellServicePackageDto } from './dto/sell-service-package.dto';
import { ListCustomerServicePackagesQueryDto } from './dto/list-customer-service-packages-query.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit-log.interceptor';

// A specific package sold to a specific customer+vehicle — separate from
// ServicePackagesController's template catalogue, same permission
// resource (`service-package`) though: anyone who manages the catalogue
// also sells/manages sold instances, no resource-proliferation for this.
@ApiBearerAuth()
@ApiTags('customer-service-packages')
@Controller('customer-service-packages')
export class CustomerServicePackagesController {
  constructor(private readonly customerServicePackagesService: CustomerServicePackagesService) {}

  @Permissions('service-package:create')
  @Post()
  @Audit('customer-service-package.sell', 'CustomerServicePackage')
  sell(@Body() dto: SellServicePackageDto) {
    return this.customerServicePackagesService.sell(dto);
  }

  @Permissions('service-package:read')
  @Get()
  findAll(@Query() query: ListCustomerServicePackagesQueryDto) {
    return this.customerServicePackagesService.findAll(query);
  }

  @Permissions('service-package:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customerServicePackagesService.findOne(id);
  }

  @Permissions('service-package:create')
  @Post(':id/renew')
  @Audit('customer-service-package.renew', 'CustomerServicePackage')
  renew(@Param('id') id: string) {
    return this.customerServicePackagesService.renew(id);
  }

  @Permissions('service-package:update')
  @Patch(':id/cancel')
  @Audit('customer-service-package.cancel', 'CustomerServicePackage')
  cancel(@Param('id') id: string) {
    return this.customerServicePackagesService.cancel(id);
  }
}
