import { EstimateStatus } from '@prisma/client';

/**
 * Deliberately narrow — NOT EstimatesService.findOne()'s full row. Per the
 * architecture doc §3.2: no customer email/mobile, no internal ids beyond
 * what's already embedded in the token, nothing that reaches into other
 * tenant data. Built explicitly in estimate-approval.service.ts, never by
 * spreading a full Estimate row into the response.
 */
export interface EstimateApprovalSummary {
  estimateNumber: string;
  status: EstimateStatus;
  jobDescription: string | null;
  vehicleLabel: string;
  customerName: string;
  lineItems: { description: string; quantity: string; unitPrice: string; gstRate: string; lineTotal: string }[];
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  total: string;
}
