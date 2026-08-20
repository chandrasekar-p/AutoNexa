import { Badge } from '@/components/ui/badge';
import type { JobCardStatus } from '@/lib/api-types';

const STATUS_TONE: Record<JobCardStatus, 'neutral' | 'accent' | 'warning' | 'success' | 'danger'> = {
  OPEN: 'neutral',
  DIAGNOSIS: 'accent',
  WAITING_APPROVAL: 'warning',
  APPROVED: 'accent',
  IN_PROGRESS: 'accent',
  WAITING_PARTS: 'warning',
  QUALITY_CHECK: 'accent',
  READY_FOR_DELIVERY: 'success',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};

const STATUS_LABEL: Record<JobCardStatus, string> = {
  OPEN: 'Open',
  DIAGNOSIS: 'Diagnosis',
  WAITING_APPROVAL: 'Waiting Approval',
  APPROVED: 'Approved',
  IN_PROGRESS: 'In Progress',
  WAITING_PARTS: 'Waiting Parts',
  QUALITY_CHECK: 'Quality Check',
  READY_FOR_DELIVERY: 'Ready for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export function JobCardStatusBadge({ status }: { status: JobCardStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
