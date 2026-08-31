import { Check, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { PurchaseOrderProgress } from '@/lib/purchases/purchase-order-progress';

const STEPS: { key: keyof Omit<PurchaseOrderProgress, 'cancelled'>; label: string }[] = [
  { key: 'ordered', label: 'Ordered' },
  { key: 'goodsReceived', label: 'Goods Received' },
  { key: 'invoiced', label: 'Purchase Invoice' },
  { key: 'paid', label: 'Supplier Payment' },
];

/** Visualizes the Ordered → Goods Received → Purchase Invoice → Supplier Payment workflow. A cancelled order keeps whatever steps were already completed but marks the rest as stopped, not merely "pending". */
export function PurchaseOrderProgressStepper({ progress }: { progress: PurchaseOrderProgress }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center">
        {STEPS.map((step, index) => {
          const isDone = progress[step.key];
          const isStopped = progress.cancelled && !isDone;
          return (
            <div key={step.key} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                    isDone
                      ? 'border-success-500 bg-success-500 text-white'
                      : isStopped
                        ? 'border-danger-300 bg-danger-50 text-danger-500 dark:border-danger-500/40 dark:bg-danger-500/10'
                        : 'border-line bg-surface text-ink-muted',
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" aria-hidden /> : isStopped ? <X className="h-4 w-4" aria-hidden /> : index + 1}
                </div>
                <span className={cn('whitespace-nowrap text-xs', isDone ? 'font-medium text-ink' : 'text-ink-muted')}>{step.label}</span>
              </div>
              {index < STEPS.length - 1 ? (
                <div className={cn('mx-2 h-0.5 flex-1', isDone ? 'bg-success-500' : 'bg-line')} />
              ) : null}
            </div>
          );
        })}
      </div>
      {progress.cancelled ? (
        <p className="text-xs text-danger-600 dark:text-danger-400">This purchase order was cancelled — the workflow has stopped.</p>
      ) : null}
    </div>
  );
}
