import type { ReactNode } from 'react';

/** A small numbered/lettered circle + title — used to break a long form into visually distinct steps (Customer form, Vehicle form, ...). */
export function SectionHeading({ number, title, subtitle }: { number: number; title: string; subtitle?: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-500 text-micro font-semibold text-white">
        {number}
      </span>
      <div>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {subtitle ? <p className="text-xs text-ink-muted">{subtitle}</p> : null}
      </div>
    </div>
  );
}
