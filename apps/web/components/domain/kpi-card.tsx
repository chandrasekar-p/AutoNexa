import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

interface KpiCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  /** Text tone for sublabel — distinct from `tone` (the card's own accent bar/icon color) since a KPI's trend direction (up/down/flat) is a separate signal from the card's identity color. */
  sublabelTone?: 'success' | 'danger' | 'muted';
  tone?: 'neutral' | 'accent' | 'warning' | 'danger' | 'blue' | 'fuchsia' | 'teal';
  icon?: ReactNode;
  /** Navigates to the KPI's relevant module — e.g. Total Customers → /customers. Omit for a static (non-clickable) card. */
  href?: string;
}

// Solid-fill badges (a white icon on a saturated square), not the soft
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
 * Icon-and-number share the top row, label + trend stack underneath,
 * left-aligned under the icon — matching the reference dashboard's card
 * layout. No accent top-edge: the icon square itself carries the card's
 * identity color.
 */
const sublabelToneClass: Record<NonNullable<KpiCardProps['sublabelTone']>, string> = {
  success: 'text-success-600 dark:text-success-400',
  danger: 'text-danger-600 dark:text-danger-400',
  muted: 'text-accent-600 dark:text-accent-400',
};

export function KpiCard({ label, value, sublabel, sublabelTone = 'muted', tone = 'neutral', icon, href }: KpiCardProps) {
  const body = (
    <div className="flex flex-col gap-3 px-5 py-4">
      <div className="flex items-center gap-3">
        {icon ? (
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', toneIconBg[tone])} aria-hidden>
            {icon}
          </div>
        ) : null}
        <span className="num truncate text-2xl font-bold leading-none text-ink sm:text-[26px]">{value}</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="truncate text-sm text-ink-secondary">{label}</span>
        {sublabel ? <span className={cn('text-xs font-medium', sublabelToneClass[sublabelTone])}>{sublabel}</span> : null}
      </div>
    </div>
  );

  const className = 'block overflow-hidden rounded-lg border border-line bg-surface shadow-card transition-colors';

  return href ? (
    <Link href={href} className={cn(className, 'hover:border-accent-400')}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
