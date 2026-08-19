import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit-log.interceptor';

@ApiBearerAuth()
@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Permissions('customer:create')
  @Post()
  @Audit('customer.create', 'Customer')
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Permissions('customer:read')
  @Get()
  findAll(@Query() query: ListCustomersQueryDto) {
    return this.customersService.findAll(query);
  }

  @Permissions('customer:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Permissions('customer:update')
  @Patch(':id')
  @Audit('customer.update', 'Customer')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Permissions('customer:delete')
  @Delete(':id')
  @Audit('customer.delete', 'Customer')
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
