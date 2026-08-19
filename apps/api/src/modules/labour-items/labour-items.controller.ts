import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LabourItemsService } from './labour-items.service';
import { CreateLabourItemDto } from './dto/create-labour-item.dto';
import { UpdateLabourItemDto } from './dto/update-labour-item.dto';
import { ListLabourItemsQueryDto } from './dto/list-labour-items-query.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit-log.interceptor';

@ApiBearerAuth()
@ApiTags('labour-items')
@Controller('labour-items')
export class LabourItemsController {
  constructor(private readonly labourItemsService: LabourItemsService) {}

  @Permissions('labour:create')
  @Post()
  @Audit('labour-item.create', 'LabourItem')
  create(@Body() dto: CreateLabourItemDto) {
    return this.labourItemsService.create(dto);
  }

  @Permissions('labour:read')
  @Get()
  findAll(@Query() query: ListLabourItemsQueryDto) {
    return this.labourItemsService.findAll(query);
  }

  @Permissions('labour:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.labourItemsService.findOne(id);
  }

  @Permissions('labour:update')
  @Patch(':id')
  @Audit('labour-item.update', 'LabourItem')
  update(@Param('id') id: string, @Body() dto: UpdateLabourItemDto) {
    return this.labourItemsService.update(id, dto);
  }

  @Permissions('labour:delete')
  @Delete(':id')
  @Audit('labour-item.delete', 'LabourItem')
  remove(@Param('id') id: string) {
    return this.labourItemsService.remove(id);
  }
}
