import { Card, CardBody } from '@/components/ui/card';

interface ComingSoonProps {
  title: string;
  phaseNote?: string;
}

/**
 * Placeholder for every nav destination not yet built — see
 * components/layout/nav-items.ts. Keeps the shell fully wired now so
 * later frontend phases only add a real page.tsx, not shell rework.
 */
export function ComingSoon({ title, phaseNote }: ComingSoonProps) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      <Card>
        <CardBody className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="h-2 w-2 rounded-full bg-accent-300" aria-hidden />
          <p className="text-sm font-medium text-ink-secondary">This module isn&rsquo;t built yet.</p>
          <p className="max-w-sm text-xs text-ink-muted">
            {phaseNote ?? 'Coming in a later frontend phase, same cadence as the backend phases it depends on.'}
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
