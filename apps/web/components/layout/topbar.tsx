'use client';

import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { GlobalSearch } from '@/components/domain/global-search';
import { AttendanceClockWidget } from '@/components/domain/attendance-clock-widget';
import { UserMenu } from './user-menu';
import type { CurrentTenant } from '@/lib/api-types';

/**
 * GET /tenants/me requires `tenant:read`, which only Workshop Owner (and
 * Super Admin) get by default (see default-role-grants.ts) — most other
 * roles will 403 here. That's expected, not a bug: this fetch fails
 * silently and the workshop name is simply omitted, rather than breaking
 * the whole shell over a permission most roles don't have.
 */
function useWorkshopName(): string | null {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<CurrentTenant>('/tenants/me')
      .then((tenant) => {
        if (!cancelled) setName(tenant.name);
      })
      .catch(() => {
        // Expected for most roles — see doc comment above.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return name;
}

interface TopbarProps {
  onOpenMobileNav: () => void;
}

export function Topbar({ onOpenMobileNav }: TopbarProps) {
  const workshopName = useWorkshopName();

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-line bg-surface px-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-6">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-ink-secondary hover:bg-surface-hover hover:text-ink lg:hidden"
        >
          <Menu aria-hidden className="h-5 w-5" />
        </button>
        <span className="hidden shrink-0 text-sm font-medium text-ink md:block">
          {workshopName ?? <span className="text-ink-muted">&nbsp;</span>}
        </span>
        <GlobalSearch />
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <AttendanceClockWidget />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
