import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JobCardsService } from './job-cards.service';
import { CreateJobCardDto } from './dto/create-job-card.dto';
import { UpdateJobCardDto } from './dto/update-job-card.dto';
import { UpdateJobCardStatusDto } from './dto/update-job-card-status.dto';
import { ListJobCardsQueryDto } from './dto/list-job-cards-query.dto';
import { CreateJobCardLabourDto } from './dto/create-job-card-labour.dto';
import { CreateJobCardNoteDto } from './dto/create-job-card-note.dto';
import { CreateJobCardPartDto } from './dto/create-job-card-part.dto';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit-log.interceptor';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiBearerAuth()
@ApiTags('job-cards')
@Controller('job-cards')
export class JobCardsController {
  constructor(private readonly jobCardsService: JobCardsService) {}

  @Permissions('job-card:create')
  @Post()
  @Audit('job-card.create', 'JobCard')
  create(@Body() dto: CreateJobCardDto) {
    return this.jobCardsService.create(dto);
  }

  @Permissions('job-card:read')
  @Get()
  findAll(@Query() query: ListJobCardsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.jobCardsService.findAll(query, user.userId);
  }

  @Permissions('job-card:read')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.jobCardsService.findOne(id, user.userId);
  }

  @Permissions('job-card:update')
  @Patch(':id')
  @Audit('job-card.update', 'JobCard')
  update(@Param('id') id: string, @Body() dto: UpdateJobCardDto, @CurrentUser() user: AuthenticatedUser) {
    return this.jobCardsService.update(id, dto, user.userId);
  }

  @Permissions('job-card:update')
  @Patch(':id/status')
  @Audit('job-card.status.update', 'JobCard')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateJobCardStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.jobCardsService.updateStatus(id, dto, user.userId);
  }

  @Permissions('job-card:read')
  @Get(':id/status-history')
  getStatusHistory(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.jobCardsService.getStatusHistory(id, user.userId);
  }

  @Permissions('job-card:update')
  @Post(':id/labour')
  @Audit('job-card.labour.add', 'JobCardLabour')
  addLabour(@Param('id') id: string, @Body() dto: CreateJobCardLabourDto, @CurrentUser() user: AuthenticatedUser) {
    return this.jobCardsService.addLabour(id, dto, user.userId);
  }

  @Permissions('job-card:update')
  @Delete(':id/labour/:lineId')
  @Audit('job-card.labour.remove', 'JobCardLabour')
  removeLabour(@Param('id') id: string, @Param('lineId') lineId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.jobCardsService.removeLabour(id, lineId, user.userId);
  }

  @Permissions('job-card:update')
  @Post(':id/parts')
  @Audit('job-card.part.add', 'JobCardPart')
  addPart(@Param('id') id: string, @Body() dto: CreateJobCardPartDto, @CurrentUser() user: AuthenticatedUser) {
    return this.jobCardsService.addPart(id, dto, user.userId);
  }

  @Permissions('job-card:update')
  @Delete(':id/parts/:lineId')
  @Audit('job-card.part.remove', 'JobCardPart')
  removePart(@Param('id') id: string, @Param('lineId') lineId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.jobCardsService.removePart(id, lineId, user.userId);
  }

  @Permissions('job-card:update')
  @Post(':id/notes')
  @Audit('job-card.note.add', 'JobCardNote')
  addNote(
    @Param('id') id: string,
    @Body() dto: CreateJobCardNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.jobCardsService.addNote(id, dto, user.userId);
  }

  @Permissions('invoice:create')
  @Post(':id/generate-invoice')
  @Audit('job-card.generate-invoice', 'Invoice')
  generateInvoice(@Param('id') id: string, @Body() dto: GenerateInvoiceDto) {
    return this.jobCardsService.generateInvoice(id, dto);
  }
}
