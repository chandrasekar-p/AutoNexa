import { Badge } from '@/components/ui/badge';
import type { InvoiceDisplayStatus } from '@/lib/api-types';

const TONE: Record<InvoiceDisplayStatus, 'neutral' | 'warning' | 'success' | 'danger'> = {
  UNPAID: 'neutral',
  PARTIALLY_PAID: 'warning',
  PAID: 'success',
  REFUNDED: 'neutral',
  OVERDUE: 'danger',
};

export const INVOICE_DISPLAY_STATUS_LABEL: Record<InvoiceDisplayStatus, string> = {
  UNPAID: 'Unpaid',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
  REFUNDED: 'Refunded',
  OVERDUE: 'Overdue',
};

/** The derived 5-way status (Overdue included) — for the list table, KPI cards, and tabs. Use InvoiceStatusBadge instead where only the raw stored status applies. */
export function InvoiceDisplayStatusBadge({ status }: { status: InvoiceDisplayStatus }) {
  return <Badge tone={TONE[status]}>{INVOICE_DISPLAY_STATUS_LABEL[status]}</Badge>;
}
