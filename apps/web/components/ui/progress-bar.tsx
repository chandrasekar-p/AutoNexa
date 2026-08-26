import { cn } from '@/lib/cn';

interface ProgressBarProps {
  /** 0–100 */
  value: number;
  className?: string;
  fillClassName?: string;
}

export function ProgressBar({ value, className, fillClassName }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-hover', className)}
    >
      <div className={cn('h-full rounded-full bg-accent-500 transition-[width]', fillClassName)} style={{ width: `${clamped}%` }} />
    </div>
  );
}
