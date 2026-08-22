import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WarrantyClaimsService } from './warranty-claims.service';
import { CreateWarrantyClaimDto } from './dto/create-warranty-claim.dto';
import { UpdateWarrantyClaimDto } from './dto/update-warranty-claim.dto';
import { ListWarrantyClaimsQueryDto } from './dto/list-warranty-claims-query.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit-log.interceptor';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiBearerAuth()
@ApiTags('warranty-claims')
@Controller('warranty-claims')
export class WarrantyClaimsController {
  constructor(private readonly warrantyClaimsService: WarrantyClaimsService) {}

  // :create — any Technician/Service Advisor can raise a suspected
  // comeback. :update (below) is the separate, manager-restricted action
  // for actually approving/rejecting it — see default-role-grants.ts.
  @Permissions('warranty-claim:create')
  @Post()
  @Audit('warranty-claim.create', 'WarrantyClaim')
  create(@Body() dto: CreateWarrantyClaimDto) {
    return this.warrantyClaimsService.create(dto);
  }

  @Permissions('warranty-claim:read')
  @Get()
  findAll(@Query() query: ListWarrantyClaimsQueryDto) {
    return this.warrantyClaimsService.findAll(query);
  }

  @Permissions('warranty-claim:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.warrantyClaimsService.findOne(id);
  }

  @Permissions('warranty-claim:update')
  @Patch(':id')
  @Audit('warranty-claim.update', 'WarrantyClaim')
  update(@Param('id') id: string, @Body() dto: UpdateWarrantyClaimDto, @CurrentUser() user: AuthenticatedUser) {
    return this.warrantyClaimsService.update(id, dto, user.userId);
  }
}
