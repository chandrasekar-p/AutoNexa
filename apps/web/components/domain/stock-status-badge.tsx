import { Badge } from '@/components/ui/badge';
import type { PartStockStatus } from '@/lib/api-types';

const TONE: Record<PartStockStatus, 'success' | 'warning' | 'danger'> = {
  in_stock: 'success',
  low_stock: 'warning',
  out_of_stock: 'danger',
};
const LABEL: Record<PartStockStatus, string> = {
  in_stock: 'In Stock',
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
};

/** Text + color, never color alone — the badge label itself says the state, matching the spec's own "do not rely only on color" rule. */
export function StockStatusBadge({ status }: { status: PartStockStatus }) {
  return <Badge tone={TONE[status]}>{LABEL[status]}</Badge>;
}
