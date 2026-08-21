import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface KpiCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  tone?: 'neutral' | 'accent' | 'warning' | 'danger' | 'blue' | 'fuchsia' | 'teal';
  icon?: ReactNode;
}

const toneBar: Record<NonNullable<KpiCardProps['tone']>, string> = {
  neutral: 'bg-graphite-300',
  accent: 'bg-accent-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  blue: 'bg-blue-600',
  fuchsia: 'bg-fuchsia-600',
  teal: 'bg-teal-600',
};

// Solid-fill badges (a white icon on a saturated circle), not the soft
// tinted-background style used elsewhere in the app (Badge, etc.) —
// deliberately bolder for the dashboard specifically. blue/fuchsia/teal
// extend the brand's accent/success/warning/danger set for per-card
// variety; validated as a set (scripts/validate_palette.js, the dataviz
// skill) at #c07333,#2563eb,#0f9d68,#c026d3,#0d9488,#d69a1f — every
// adjacent pair clears the CVD/normal-vision floors. Reused unmodified in
// dark mode, same precedent as lib/chart-colors.ts's own doc comment: a
// solid opaque badge with a white glyph reads fine on either surface, so
// splitting per-theme steps (like Badge.tsx's tinted-background tones do)
// isn't needed here.
const toneIconBg: Record<NonNullable<KpiCardProps['tone']>, string> = {
  neutral: 'bg-graphite-400 text-white',
  accent: 'bg-accent-500 text-white',
  warning: 'bg-warning-500 text-white',
  danger: 'bg-danger-500 text-white',
  blue: 'bg-blue-600 text-white',
  fuchsia: 'bg-fuchsia-600 text-white',
  teal: 'bg-teal-600 text-white',
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
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', toneIconBg[tone])} aria-hidden>
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
