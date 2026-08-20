import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';
import { WhatsAppProvider } from './providers/whatsapp.provider';
import { SlackProvider } from './providers/slack.provider';
import { ReminderCronService } from './reminder-cron.service';
import { DeliveryLogsController } from './delivery-logs.controller';
import { DeliveryLogsService } from './delivery-logs.service';

@Module({
  controllers: [DeliveryLogsController],
  providers: [
    MessagingService,
    EmailProvider,
    SmsProvider,
    WhatsAppProvider,
    SlackProvider,
    ReminderCronService,
    DeliveryLogsService,
  ],
  exports: [MessagingService],
})
export class MessagingModule {}
