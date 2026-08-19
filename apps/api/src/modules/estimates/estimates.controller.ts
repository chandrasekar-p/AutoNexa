import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EstimatesService } from './estimates.service';
import { CreateEstimateDto } from './dto/create-estimate.dto';
import { UpdateEstimateDto } from './dto/update-estimate.dto';
import { ListEstimatesQueryDto } from './dto/list-estimates-query.dto';
import { CreateEstimateLineItemDto } from './dto/create-estimate-line-item.dto';
import { UpdateEstimateLineItemDto } from './dto/update-estimate-line-item.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit-log.interceptor';

@ApiBearerAuth()
@ApiTags('estimates')
@Controller('estimates')
export class EstimatesController {
  constructor(private readonly estimatesService: EstimatesService) {}

  @Permissions('estimate:create')
  @Post()
  @Audit('estimate.create', 'Estimate')
  create(@Body() dto: CreateEstimateDto) {
    return this.estimatesService.create(dto);
  }

  @Permissions('estimate:read')
  @Get()
  findAll(@Query() query: ListEstimatesQueryDto) {
    return this.estimatesService.findAll(query);
  }

  @Permissions('estimate:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.estimatesService.findOne(id);
  }

  @Permissions('estimate:update')
  @Patch(':id')
  @Audit('estimate.update', 'Estimate')
  update(@Param('id') id: string, @Body() dto: UpdateEstimateDto) {
    return this.estimatesService.update(id, dto);
  }

  @Permissions('estimate:delete')
  @Delete(':id')
  @Audit('estimate.delete', 'Estimate')
  remove(@Param('id') id: string) {
    return this.estimatesService.remove(id);
  }

  @Permissions('estimate:update')
  @Post(':id/line-items')
  @Audit('estimate.line-item.add', 'EstimateLineItem')
  addLineItem(@Param('id') id: string, @Body() dto: CreateEstimateLineItemDto) {
    return this.estimatesService.addLineItem(id, dto);
  }

  @Permissions('estimate:update')
  @Patch(':id/line-items/:itemId')
  @Audit('estimate.line-item.update', 'EstimateLineItem')
  updateLineItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateEstimateLineItemDto,
  ) {
    return this.estimatesService.updateLineItem(id, itemId, dto);
  }

  @Permissions('estimate:update')
  @Delete(':id/line-items/:itemId')
  @Audit('estimate.line-item.remove', 'EstimateLineItem')
  removeLineItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.estimatesService.removeLineItem(id, itemId);
  }

  @Permissions('estimate:update')
  @Post(':id/approve')
  @Audit('estimate.approve', 'Estimate')
  approve(@Param('id') id: string) {
    return this.estimatesService.approve(id);
  }

  @Permissions('estimate:update')
  @Post(':id/reject')
  @Audit('estimate.reject', 'Estimate')
  reject(@Param('id') id: string) {
    return this.estimatesService.reject(id);
  }

  @Permissions('estimate:update')
  @Post(':id/convert-to-job-card')
  @Audit('estimate.convert-to-job-card', 'Estimate')
  convertToJobCard(@Param('id') id: string) {
    return this.estimatesService.convertToJobCard(id);
  }
}
