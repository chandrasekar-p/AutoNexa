import { Controller, Get, HttpCode, HttpStatus, Param, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { EstimateApprovalService } from './estimate-approval.service';

// @Public() on every route here — a customer opening a WhatsApp/SMS/Email
// link has no JWT, no session. Authenticity comes entirely from the
// signed token in the URL (see estimate-approval-token.service.ts), not
// RBAC — same "public endpoint with its own verification" shape as
// RazorpayWebhookController, just with the token verified inline here
// instead of over a webhook body.
//
// @Throttle() overrides the global 100/60s default (app.module.ts) —
// first per-route use of it in this codebase (see the architecture doc
// §6). Tighter than the default deliberately: this is genuinely public,
// customer-facing traffic, unlike the Razorpay webhook's trusted
// server-to-server calls.
@ApiTags('estimate-approval')
@Controller('estimates/approve')
export class EstimateApprovalController {
  constructor(private readonly estimateApproval: EstimateApprovalService) {}

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get(':token')
  getSummary(@Param('token') token: string, @Req() req: Request) {
    return this.estimateApproval.getSummary(token, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post(':token/approve')
  @HttpCode(HttpStatus.OK)
  approve(@Param('token') token: string, @Req() req: Request) {
    return this.decide(token, 'APPROVED', req);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post(':token/reject')
  @HttpCode(HttpStatus.OK)
  reject(@Param('token') token: string, @Req() req: Request) {
    return this.decide(token, 'REJECTED', req);
  }

  private decide(token: string, decision: 'APPROVED' | 'REJECTED', req: Request) {
    return this.estimateApproval.decide(token, decision, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }
}
