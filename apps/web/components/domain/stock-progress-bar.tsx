import { ProgressBar } from '@/components/ui/progress-bar';
import type { PartStockStatus } from '@/lib/api-types';

interface StockProgressBarProps {
  currentStock: number;
  maxStock: number | null;
  status: PartStockStatus;
  className?: string;
}

const FILL_TONE: Record<PartStockStatus, string> = {
  in_stock: 'bg-success-500',
  low_stock: 'bg-warning-500',
  out_of_stock: 'bg-danger-500',
};

/** "18 / 20" + a compact bar when a real maxStock ceiling exists; just the plain count when it doesn't (maxStock is optional — no fabricated denominator). */
export function StockProgressBar({ currentStock, maxStock, status, className }: StockProgressBarProps) {
  if (maxStock === null || maxStock <= 0) {
    return <span className="num text-sm text-ink">{currentStock} in stock</span>;
  }
  const percent = Math.max(0, Math.min(100, Math.round((currentStock / maxStock) * 100)));
  return (
    <div className={className}>
      <span className="num text-sm text-ink">
        {currentStock} / {maxStock}
      </span>
      <ProgressBar value={percent} className="mt-1" fillClassName={FILL_TONE[status]} />
    </div>
  );
}
