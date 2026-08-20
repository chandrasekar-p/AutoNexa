import { Badge } from '@/components/ui/badge';
import type { PurchaseOrderStatus } from '@/lib/api-types';

export const PURCHASE_ORDER_STATUS_TONE: Record<PurchaseOrderStatus, 'neutral' | 'accent' | 'warning' | 'success' | 'danger'> = {
  DRAFT: 'neutral',
  SENT: 'accent',
  PARTIALLY_RECEIVED: 'warning',
  RECEIVED: 'success',
  CANCELLED: 'danger',
};

export const PURCHASE_ORDER_STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  PARTIALLY_RECEIVED: 'Partially Received',
  RECEIVED: 'Received',
  CANCELLED: 'Cancelled',
};

export function PurchaseOrderStatusBadge({ status }: { status: PurchaseOrderStatus }) {
  return <Badge tone={PURCHASE_ORDER_STATUS_TONE[status]}>{PURCHASE_ORDER_STATUS_LABEL[status]}</Badge>;
}
