import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PartCategoriesService } from './part-categories.service';
import { CreatePartCategoryDto } from './dto/create-part-category.dto';
import { UpdatePartCategoryDto } from './dto/update-part-category.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit-log.interceptor';

// A distinct top-level path (not nested under /parts/:id) rather than
// something like /parts/categories — Nest/Express match routes in
// registration order, not by specificity, so /parts/categories would risk
// being shadowed by /parts/:id if that controller's routes registered
// first. No separate 'part-category' permission resource exists in the
// catalogue, so this reuses 'part:*'.
@ApiBearerAuth()
@ApiTags('part-categories')
@Controller('part-categories')
export class PartCategoriesController {
  constructor(private readonly partCategoriesService: PartCategoriesService) {}

  @Permissions('part:create')
  @Post()
  @Audit('part-category.create', 'PartCategory')
  create(@Body() dto: CreatePartCategoryDto) {
    return this.partCategoriesService.create(dto);
  }

  @Permissions('part:read')
  @Get()
  findAll() {
    return this.partCategoriesService.findAll();
  }

  @Permissions('part:update')
  @Patch(':id')
  @Audit('part-category.update', 'PartCategory')
  update(@Param('id') id: string, @Body() dto: UpdatePartCategoryDto) {
    return this.partCategoriesService.update(id, dto);
  }

  @Permissions('part:delete')
  @Delete(':id')
  @Audit('part-category.delete', 'PartCategory')
  remove(@Param('id') id: string) {
    return this.partCategoriesService.remove(id);
  }
}
