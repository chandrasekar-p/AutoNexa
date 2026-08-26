import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InspectionsService } from './inspections.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { ListInspectionsQueryDto } from './dto/list-inspections-query.dto';
import { CreateInspectionItemDto } from './dto/create-inspection-item.dto';
import { UpdateInspectionItemDto } from './dto/update-inspection-item.dto';
import { AddInspectionPhotoDto } from './dto/add-inspection-photo.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit-log.interceptor';

@ApiBearerAuth()
@ApiTags('inspections')
@Controller('inspections')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Permissions('inspection:create')
  @Post()
  @Audit('inspection.create', 'Inspection')
  create(@Body() dto: CreateInspectionDto) {
    return this.inspectionsService.create(dto);
  }

  @Permissions('inspection:read')
  @Get()
  findAll(@Query() query: ListInspectionsQueryDto) {
    return this.inspectionsService.findAll(query);
  }

  // Registered before Get(':id') — otherwise ':id' would swallow the
  // literal 'summary' segment (see CLAUDE.md's route-ordering note).
  @Permissions('inspection:read')
  @Get('summary')
  summary() {
    return this.inspectionsService.summary();
  }

  @Permissions('inspection:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inspectionsService.findOne(id);
  }

  @Permissions('inspection:update')
  @Patch(':id')
  @Audit('inspection.update', 'Inspection')
  update(@Param('id') id: string, @Body() dto: UpdateInspectionDto) {
    return this.inspectionsService.update(id, dto);
  }

  @Permissions('inspection:delete')
  @Delete(':id')
  @Audit('inspection.delete', 'Inspection')
  remove(@Param('id') id: string) {
    return this.inspectionsService.remove(id);
  }

  @Permissions('inspection:update')
  @Post(':id/items')
  @Audit('inspection.item.add', 'InspectionItem')
  addItem(@Param('id') id: string, @Body() dto: CreateInspectionItemDto) {
    return this.inspectionsService.addItem(id, dto);
  }

  @Permissions('inspection:update')
  @Patch(':id/items/:itemId')
  @Audit('inspection.item.update', 'InspectionItem')
  updateItem(@Param('id') id: string, @Param('itemId') itemId: string, @Body() dto: UpdateInspectionItemDto) {
    return this.inspectionsService.updateItem(id, itemId, dto);
  }

  @Permissions('inspection:update')
  @Delete(':id/items/:itemId')
  @Audit('inspection.item.remove', 'InspectionItem')
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.inspectionsService.removeItem(id, itemId);
  }

  @Permissions('inspection:update')
  @Post(':id/photos')
  @Audit('inspection.photo.add', 'InspectionPhoto')
  addPhoto(@Param('id') id: string, @Body() dto: AddInspectionPhotoDto) {
    return this.inspectionsService.addPhoto(id, dto);
  }

  @Permissions('inspection:update')
  @Delete(':id/photos/:photoId')
  @Audit('inspection.photo.remove', 'InspectionPhoto')
  removePhoto(@Param('id') id: string, @Param('photoId') photoId: string) {
    return this.inspectionsService.removePhoto(id, photoId);
  }
}
