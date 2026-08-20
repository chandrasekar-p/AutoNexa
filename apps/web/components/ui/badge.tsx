import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'success' | 'danger' | 'warning' | 'accent';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-graphite-100 text-graphite-700 dark:bg-graphite-700/40 dark:text-graphite-300',
  success: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400',
  danger: 'bg-danger-50 text-danger-700 dark:bg-danger-500/15 dark:text-danger-400',
  warning: 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400',
  accent: 'bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-micro font-semibold uppercase tracking-wide',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
