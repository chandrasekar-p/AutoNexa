import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module';
import { MessagingModule } from '../messaging/messaging.module';
import { JobCardsService } from './job-cards.service';
import { JobCardsController } from './job-cards.controller';

@Module({
  imports: [InvoicesModule, MessagingModule],
  controllers: [JobCardsController],
  providers: [JobCardsService],
  exports: [JobCardsService],
})
export class JobCardsModule {}
