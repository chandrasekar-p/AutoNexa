import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { cn } from '@/lib/cn';

export interface ReportCategoryGroup {
  category: string;
  reports: { key: string; label: string }[];
}

/**
 * Persistent report-navigation card — one entry per REPORTS[] item, grouped
 * by category, active item in the AutoNexa orange accent. Switching reports
 * here is just a state update in the parent (page.tsx), never a route
 * change/reload — matches every other report-switch path on this page.
 */
export function ReportCategoriesCard({
  groups,
  activeKey,
  onSelect,
}: {
  groups: ReportCategoryGroup[];
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Categories</CardTitle>
      </CardHeader>
      {/* Capped + scrollable, not paginated — this is a navigation list, not a data table, and a nav menu that changes page count on click would be a worse experience than a normal scrollbar. The cap keeps it from dwarfing the shorter chart/insights cards next to it. */}
      <CardBody className="flex max-h-[26rem] flex-col gap-4 overflow-y-auto pt-2">
        {groups.map((group) => (
          <div key={group.category} className="flex flex-col gap-1">
            <span className="text-micro font-semibold uppercase tracking-wide text-ink-muted">{group.category}</span>
            {group.reports.map((report) => (
              <button
                key={report.key}
                type="button"
                onClick={() => onSelect(report.key)}
                className={cn(
                  'rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                  report.key === activeKey
                    ? 'bg-accent-50 font-medium text-accent-700 dark:bg-accent-500/15 dark:text-accent-300'
                    : 'text-ink-secondary hover:bg-surface-hover hover:text-ink',
                )}
              >
                {report.label}
              </button>
            ))}
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
