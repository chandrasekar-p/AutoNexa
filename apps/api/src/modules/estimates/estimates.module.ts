import { Module } from '@nestjs/common';
import { JobCardsModule } from '../job-cards/job-cards.module';
import { EstimatesService } from './estimates.service';
import { EstimatesController } from './estimates.controller';

@Module({
  imports: [JobCardsModule],
  controllers: [EstimatesController],
  providers: [EstimatesService],
  exports: [EstimatesService],
})
export class EstimatesModule {}
