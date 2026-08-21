import { Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentsGatewayService } from './payments-gateway.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit-log.interceptor';

// Deliberately its own controller/file, not folded into InvoicesController —
// InvoicesModule has no reason to know the payment gateway exists (avoids
// a circular module dependency: this module already imports InvoicesModule
// to call InvoicesService.applyCapturedPayment from the webhook path).
// Nest merges routes from multiple controllers sharing the same path
// prefix fine, so this still reads as a normal invoice sub-resource route.
@ApiBearerAuth()
@ApiTags('invoices')
@Controller('invoices')
export class PaymentLinkController {
  constructor(private readonly paymentsGateway: PaymentsGatewayService) {}

  // Same permission as manual payment recording (POST /invoices/:id/payments)
  // — anyone who can record a payment can also generate a link for one.
  @Permissions('payment:create')
  @Post(':id/payment-link')
  @Audit('invoice.payment-link.create', 'Invoice')
  createPaymentLink(@Param('id') id: string) {
    return this.paymentsGateway.createPaymentLink(id);
  }
}
