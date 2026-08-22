import { Badge } from '@/components/ui/badge';
import type { WarrantyClaimStatus } from '@/lib/api-types';

export const WARRANTY_CLAIM_STATUS_TONE: Record<WarrantyClaimStatus, 'neutral' | 'accent' | 'warning' | 'success' | 'danger'> = {
  OPEN: 'accent',
  APPROVED: 'success',
  REJECTED: 'danger',
  RESOLVED: 'neutral',
};

export const WARRANTY_CLAIM_STATUS_LABEL: Record<WarrantyClaimStatus, string> = {
  OPEN: 'Open',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  RESOLVED: 'Resolved',
};

export function WarrantyClaimStatusBadge({ status }: { status: WarrantyClaimStatus }) {
  return <Badge tone={WARRANTY_CLAIM_STATUS_TONE[status]}>{WARRANTY_CLAIM_STATUS_LABEL[status]}</Badge>;
}
