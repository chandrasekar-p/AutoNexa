import { cn } from '@/lib/cn';

interface WorkloadBarProps {
  /** 0–100 */
  percent: number;
  className?: string;
}

/** Thin horizontal bar, tone shifts as it approaches capacity — green under 60%, amber 60–89%, red at 90%+. */
export function WorkloadBar({ percent, className }: WorkloadBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const fillTone = clamped >= 90 ? 'bg-danger-500' : clamped >= 60 ? 'bg-warning-500' : 'bg-success-500';

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100} className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
        <div className={cn('h-full rounded-full transition-[width]', fillTone)} style={{ width: `${clamped}%` }} />
      </div>
      <span className="num text-xs text-ink-muted">{clamped}%</span>
    </div>
  );
}
