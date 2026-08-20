import { Badge } from '@/components/ui/badge';
import type { EstimateStatus } from '@/lib/api-types';

export const ESTIMATE_STATUS_TONE: Record<EstimateStatus, 'neutral' | 'accent' | 'warning' | 'success' | 'danger'> = {
  DRAFT: 'neutral',
  SENT: 'accent',
  APPROVED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'danger',
  CONVERTED: 'success',
};

export const ESTIMATE_STATUS_LABEL: Record<EstimateStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  CONVERTED: 'Converted',
};

export function EstimateStatusBadge({ status }: { status: EstimateStatus }) {
  return <Badge tone={ESTIMATE_STATUS_TONE[status]}>{ESTIMATE_STATUS_LABEL[status]}</Badge>;
}
