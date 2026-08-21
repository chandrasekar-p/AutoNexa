import { Controller, Headers, HttpCode, HttpStatus, Post, RawBodyRequest, Req } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { PaymentsGatewayService } from './payments-gateway.service';

// @Public() — Razorpay calls this directly with no JWT; authenticity comes
// from HMAC signature verification (see verify-razorpay-signature.ts), not
// RBAC. @ApiExcludeController: this isn't a route any authenticated user
// or frontend ever calls, so it doesn't belong in the Swagger surface
// alongside the rest of the guarded API.
@ApiExcludeController()
@Controller('payments/webhooks')
export class RazorpayWebhookController {
  constructor(private readonly paymentsGateway: PaymentsGatewayService) {}

  @Public()
  @Post('razorpay')
  @HttpCode(HttpStatus.OK)
  async handleRazorpayWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string | undefined,
    @Headers('x-razorpay-event-id') eventId: string | undefined,
  ): Promise<{ status: 'ok' }> {
    // Populated by main.ts's `rawBody: true` bootstrap option — the
    // signature is computed over the exact bytes Razorpay sent, and
    // req.body here would already be JSON.parse()'d (and re-serializing it
    // is not guaranteed byte-identical), which would make a genuine
    // signature fail verification. See verify-razorpay-signature.ts.
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    await this.paymentsGateway.handleWebhook(rawBody, signature, eventId);
    // Always 200 — see the architecture doc §3.5: once the event is
    // durably recorded (or rejected) there's nothing to gain from Razorpay
    // retrying, and a real processing failure is surfaced as
    // PaymentGatewayEvent.processingError for manual review instead.
    return { status: 'ok' };
  }
}
