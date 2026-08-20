import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface KpiCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  tone?: 'neutral' | 'accent' | 'warning' | 'danger';
  icon?: ReactNode;
}

const toneBar: Record<NonNullable<KpiCardProps['tone']>, string> = {
  neutral: 'bg-graphite-300',
  accent: 'bg-accent-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
};

const toneIconBg: Record<NonNullable<KpiCardProps['tone']>, string> = {
  neutral: 'bg-graphite-100 text-graphite-500 dark:bg-graphite-700/40 dark:text-graphite-300',
  accent: 'bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-400',
  warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400',
  danger: 'bg-danger-50 text-danger-600 dark:bg-danger-500/15 dark:text-danger-400',
};

/**
 * The dashboard's signature element: a gauge-readout treatment — a thin
 * accent-colored top edge (like a needle-lit bezel), an uppercase tracked
 * label (gauge markings), and the value set in tabular monospace at a
 * deliberately large size. Every KPI on the dashboard uses this exact
 * shape so the page reads as one instrument panel, not a grid of
 * unrelated widgets.
 */
export function KpiCard({ label, value, sublabel, tone = 'neutral', icon }: KpiCardProps) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-line bg-surface shadow-card">
      <div className={cn('absolute inset-x-0 top-0 h-[3px]', toneBar[tone])} aria-hidden />
      <div className="flex items-start justify-between gap-3 px-5 pb-5 pt-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-micro font-semibold uppercase tracking-wide text-ink-secondary">{label}</span>
          <span className="num truncate text-2xl font-semibold leading-none text-ink sm:text-3xl">{value}</span>
          {sublabel ? <span className="text-xs text-ink-secondary">{sublabel}</span> : null}
        </div>
        {icon ? (
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', toneIconBg[tone])} aria-hidden>
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
