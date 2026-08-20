import { Badge } from '@/components/ui/badge';
import type { InvoiceStatus } from '@/lib/api-types';

export const INVOICE_STATUS_TONE: Record<InvoiceStatus, 'neutral' | 'warning' | 'success'> = {
  UNPAID: 'neutral',
  PARTIALLY_PAID: 'warning',
  PAID: 'success',
  REFUNDED: 'neutral',
};

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  UNPAID: 'Unpaid',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
  REFUNDED: 'Refunded',
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge tone={INVOICE_STATUS_TONE[status]}>{INVOICE_STATUS_LABEL[status]}</Badge>;
}
