import { EstimateStatus } from '@prisma/client';

/**
 * Not a real EstimateStatus — a display-only derived value the Estimates
 * list page shows to distinguish "emailed, customer hasn't opened it yet"
 * from "customer opened the link but hasn't approved/rejected." Never
 * stored; computed fresh on every read from EstimateApprovalEvent, same
 * "computed status, never persisted" discipline as computeWarrantyStatus/
 * computeServiceDue.
 */
export type EstimateApprovalStatus = EstimateStatus | 'AWAITING_APPROVAL';

/**
 * `status` stays exactly what it is for every value except SENT — a SENT
 * estimate becomes 'AWAITING_APPROVAL' once at least one 'VIEWED' row
 * exists for it (the approval-link page logs one every time a customer
 * opens it — see estimate-approval.service.ts), and stays plain 'SENT'
 * otherwise. A DRAFT/APPROVED/REJECTED/EXPIRED/CONVERTED estimate is
 * unaffected regardless of `wasViewed`. Takes a plain boolean (not the
 * events themselves) since every caller already queries for VIEWED
 * events specifically — whether that came back non-empty is all this
 * needs to know.
 */
export function deriveEstimateApprovalStatus(status: EstimateStatus, wasViewed: boolean): EstimateApprovalStatus {
  if (status !== EstimateStatus.SENT) return status;
  return wasViewed ? 'AWAITING_APPROVAL' : status;
}
