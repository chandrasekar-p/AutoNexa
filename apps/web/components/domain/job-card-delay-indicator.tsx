import { cn } from '@/lib/cn';
import type { JobCardDelayStatus } from '@/lib/api-types';

const DOT_TONE: Record<JobCardDelayStatus, string> = {
  ON_TRACK: 'bg-success-500',
  DUE_TODAY: 'bg-warning-500',
  DELAYED: 'bg-danger-500',
};
const TEXT_TONE: Record<JobCardDelayStatus, string> = {
  ON_TRACK: 'text-success-700 dark:text-success-400',
  DUE_TODAY: 'text-warning-700 dark:text-warning-400',
  DELAYED: 'text-danger-700 dark:text-danger-400',
};

interface JobCardDelayIndicatorProps {
  status: JobCardDelayStatus;
  /** Only meaningful (and only rendered) when status is DELAYED. */
  days: number | null;
}

/** A small dot + label — omitted entirely by the caller when status is null (no expectedDelivery, or the job is already DELIVERED/CANCELLED). */
export function JobCardDelayIndicator({ status, days }: JobCardDelayIndicatorProps) {
  const label = status === 'ON_TRACK' ? 'On Track' : status === 'DUE_TODAY' ? 'Due Today' : `Delayed${days ? ` · ${days}d` : ''}`;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-micro font-medium', TEXT_TONE[status])}>
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOT_TONE[status])} aria-hidden />
      {label}
    </span>
  );
}
