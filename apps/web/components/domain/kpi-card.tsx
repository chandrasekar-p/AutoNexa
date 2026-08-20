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
    <div className="relative overflow-hidden rounded-lg border border-graphite-100 bg-white shadow-card">
      <div className={cn('absolute inset-x-0 top-0 h-[3px]', toneBar[tone])} aria-hidden />
      <div className="flex items-start justify-between px-5 pb-5 pt-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-micro font-semibold uppercase tracking-wide text-graphite-500">{label}</span>
          <span className="num text-3xl font-semibold leading-none text-graphite-900">{value}</span>
          {sublabel ? <span className="text-xs text-graphite-500">{sublabel}</span> : null}
        </div>
        {icon ? <div className="text-graphite-300">{icon}</div> : null}
      </div>
    </div>
  );
}
