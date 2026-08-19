import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PartsService } from './parts.service';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { ListPartsQueryDto } from './dto/list-parts-query.dto';
import { StockLedgerQueryDto } from './dto/stock-ledger-query.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit-log.interceptor';

@ApiBearerAuth()
@ApiTags('parts')
@Controller('parts')
export class PartsController {
  constructor(private readonly partsService: PartsService) {}

  @Permissions('part:create')
  @Post()
  @Audit('part.create', 'Part')
  create(@Body() dto: CreatePartDto) {
    return this.partsService.create(dto);
  }

  @Permissions('part:read')
  @Get()
  findAll(@Query() query: ListPartsQueryDto) {
    return this.partsService.findAll(query);
  }

  @Permissions('part:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partsService.findOne(id);
  }

  @Permissions('inventory:read')
  @Get(':id/stock-ledger')
  getStockLedger(@Param('id') id: string, @Query() query: StockLedgerQueryDto) {
    return this.partsService.getStockLedger(id, query);
  }

  @Permissions('part:update')
  @Patch(':id')
  @Audit('part.update', 'Part')
  update(@Param('id') id: string, @Body() dto: UpdatePartDto) {
    return this.partsService.update(id, dto);
  }

  @Permissions('part:delete')
  @Delete(':id')
  @Audit('part.delete', 'Part')
  remove(@Param('id') id: string) {
    return this.partsService.remove(id);
  }
}
