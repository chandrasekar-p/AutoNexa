import { ProgressBar } from '@/components/ui/progress-bar';
import { formatQuantity } from '@/lib/format';
import type { PartStockStatus, PartUnit } from '@/lib/api-types';

interface StockProgressBarProps {
  currentStock: string;
  maxStock: string | null;
  unit: PartUnit;
  status: PartStockStatus;
  className?: string;
}

const FILL_TONE: Record<PartStockStatus, string> = {
  in_stock: 'bg-success-500',
  low_stock: 'bg-warning-500',
  out_of_stock: 'bg-danger-500',
};

/** "18 / 20" + a compact bar when a real maxStock ceiling exists; just the plain count when it doesn't (maxStock is optional — no fabricated denominator). currentStock/maxStock are Decimal strings — Number() before any arithmetic. */
export function StockProgressBar({ currentStock, maxStock, unit, status, className }: StockProgressBarProps) {
  const current = Number(currentStock);
  const max = maxStock === null ? null : Number(maxStock);
  if (max === null || max <= 0) {
    return <span className="num text-sm text-ink">{formatQuantity(currentStock, unit)} in stock</span>;
  }
  const percent = Math.max(0, Math.min(100, Math.round((current / max) * 100)));
  return (
    <div className={className}>
      <span className="num text-sm text-ink">
        {formatQuantity(currentStock, unit)} / {formatQuantity(maxStock!, unit)}
      </span>
      <ProgressBar value={percent} className="mt-1" fillClassName={FILL_TONE[status]} />
    </div>
  );
}
