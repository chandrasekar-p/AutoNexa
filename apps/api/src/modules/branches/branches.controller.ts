import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit-log.interceptor';

@ApiBearerAuth()
@ApiTags('branches')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Permissions('branch:create')
  @Post()
  @Audit('branch.create', 'Branch')
  create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  @Permissions('branch:read')
  @Get()
  findAll() {
    return this.branchesService.findAll();
  }

  @Permissions('branch:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }

  @Permissions('branch:update')
  @Patch(':id')
  @Audit('branch.update', 'Branch')
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(id, dto);
  }

  @Permissions('branch:delete')
  @Delete(':id')
  @Audit('branch.delete', 'Branch')
  remove(@Param('id') id: string) {
    return this.branchesService.remove(id);
  }
}
