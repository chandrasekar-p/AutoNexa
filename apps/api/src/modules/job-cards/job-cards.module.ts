import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module';
import { JobCardsService } from './job-cards.service';
import { JobCardsController } from './job-cards.controller';

@Module({
  imports: [InvoicesModule],
  controllers: [JobCardsController],
  providers: [JobCardsService],
  exports: [JobCardsService],
})
export class JobCardsModule {}
