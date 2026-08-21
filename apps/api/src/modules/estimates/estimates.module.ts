import { Module } from '@nestjs/common';
import { JobCardsModule } from '../job-cards/job-cards.module';
import { MessagingModule } from '../messaging/messaging.module';
import { EstimateApprovalTokenModule } from '../estimate-approval/estimate-approval-token.module';
import { EstimatesService } from './estimates.service';
import { EstimatesController } from './estimates.controller';

@Module({
  imports: [JobCardsModule, MessagingModule, EstimateApprovalTokenModule],
  controllers: [EstimatesController],
  providers: [EstimatesService],
  exports: [EstimatesService],
})
export class EstimatesModule {}
