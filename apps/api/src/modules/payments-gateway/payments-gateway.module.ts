import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module';
import { MessagingModule } from '../messaging/messaging.module';
import { PaymentsGatewayService } from './payments-gateway.service';
import { RazorpayProvider } from './providers/razorpay.provider';
import { PaymentLinkController } from './payment-link.controller';
import { RazorpayWebhookController } from './razorpay-webhook.controller';

// Imports InvoicesModule (one-directional) to call InvoicesService.
// applyCapturedPayment from the webhook path — InvoicesModule itself has
// no reason to import this module back, avoiding a circular dependency.
@Module({
  imports: [InvoicesModule, MessagingModule],
  controllers: [PaymentLinkController, RazorpayWebhookController],
  providers: [PaymentsGatewayService, RazorpayProvider],
})
export class PaymentsGatewayModule {}
