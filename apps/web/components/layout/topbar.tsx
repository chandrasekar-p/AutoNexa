'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api-client';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { GlobalSearch } from '@/components/domain/global-search';
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

export function Topbar() {
  const workshopName = useWorkshopName();

  return (
    <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-6">
      <div className="flex items-center gap-6">
        <span className="shrink-0 text-sm font-medium text-ink">
          {workshopName ?? <span className="text-ink-muted">&nbsp;</span>}
        </span>
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
