import { Module } from '@nestjs/common';
import { EstimatesModule } from '../estimates/estimates.module';
import { EstimateApprovalTokenModule } from './estimate-approval-token.module';
import { EstimateApprovalService } from './estimate-approval.service';
import { EstimateApprovalController } from './estimate-approval.controller';

// Imports EstimatesModule (one-directional) for EstimatesService.applyDecision
// — EstimatesModule itself never imports this module back. Also imports
// EstimateApprovalTokenModule directly (not just transitively through
// EstimatesModule) since this module needs to verify tokens, not just mint
// them — see estimate-approval-token.module.ts's doc comment for why that
// module exists on its own instead of living inside either of these two.
@Module({
  imports: [EstimatesModule, EstimateApprovalTokenModule],
  controllers: [EstimateApprovalController],
  providers: [EstimateApprovalService],
})
export class EstimateApprovalModule {}
