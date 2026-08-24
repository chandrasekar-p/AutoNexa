import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { cn } from '@/lib/cn';

function toneFor(insight: string): string {
  if (insight.startsWith('↑')) return 'text-success-600 dark:text-success-400';
  if (insight.startsWith('↓')) return 'text-danger-600 dark:text-danger-400';
  return 'text-accent-600 dark:text-accent-400';
}

/**
 * Renders whatever a report's own insight generator produced (e.g.
 * lib/reports/sales-insights.ts) — computed entirely from real data already
 * on screen, never fabricated. A report with no insight generator wired up
 * yet (every category besides Sales, for now) always passes `insights={[]}`
 * and gets the explicit "not enough data" fallback rather than silence.
 */
export function ReportInsightsCard({ insights }: { insights: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Insights</CardTitle>
      </CardHeader>
      <CardBody className="pt-2">
        {insights.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {insights.map((insight, i) => (
              <li key={i} className={cn('text-sm', toneFor(insight))}>
                {insight}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">Not enough data to generate insights.</p>
        )}
      </CardBody>
    </Card>
  );
}
