'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

interface RoleBadgeListProps {
  roles: { role: { id: string; name: string } }[];
  /** How many chips show before collapsing into "+N" — clicking expands to the full list. */
  visibleCount?: number;
}

/** `[Role A] [Role B] +2` — collapses past `visibleCount`, click to reveal the rest. No new modal/primitive needed for "clicking reveals all roles". */
export function RoleBadgeList({ roles, visibleCount = 2 }: RoleBadgeListProps) {
  const [expanded, setExpanded] = useState(false);

  if (roles.length === 0) return <span className="text-sm text-ink-muted">—</span>;

  const shown = expanded ? roles : roles.slice(0, visibleCount);
  const hiddenCount = roles.length - shown.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((r) => (
        <Badge key={r.role.id} tone="accent">
          {r.role.name}
        </Badge>
      ))}
      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded(true);
          }}
          className="rounded-full bg-graphite-100 px-2 py-0.5 text-micro font-semibold text-graphite-700 hover:bg-graphite-200 dark:bg-graphite-700/40 dark:text-graphite-300 dark:hover:bg-graphite-700/60"
        >
          +{hiddenCount}
        </button>
      ) : null}
    </div>
  );
}
