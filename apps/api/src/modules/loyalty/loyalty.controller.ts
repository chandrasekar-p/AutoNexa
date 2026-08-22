import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LoyaltyService } from './loyalty.service';
import { AdjustLoyaltyPointsDto } from './dto/adjust-loyalty-points.dto';
import { ListLoyaltyTransactionsQueryDto } from './dto/list-loyalty-transactions-query.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit-log.interceptor';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiBearerAuth()
@ApiTags('loyalty')
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Permissions('loyalty:read')
  @Get('customers/:customerId/balance')
  getBalance(@Param('customerId') customerId: string) {
    return this.loyaltyService.getBalance(customerId);
  }

  @Permissions('loyalty:read')
  @Get('transactions')
  listTransactions(@Query() query: ListLoyaltyTransactionsQueryDto) {
    return this.loyaltyService.listTransactions(query);
  }

  @Permissions('loyalty:update')
  @Post('adjust')
  @Audit('loyalty.adjust', 'LoyaltyTransaction')
  adjust(@Body() dto: AdjustLoyaltyPointsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.loyaltyService.adjust(dto, user.userId);
  }
}
