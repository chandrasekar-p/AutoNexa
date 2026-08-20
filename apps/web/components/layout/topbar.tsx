'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
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
  const { user, logout } = useAuth();
  const router = useRouter();
  const workshopName = useWorkshopName();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      router.push('/login');
    }
  }

  // See lib/auth/types.ts — `name` is only reliable right after a fresh
  // login this session; a page reload (silent refresh) has no source for
  // it, so we fall back to the email, which GET /auth/me always returns.
  const displayName = user?.name ?? user?.email ?? '';

  return (
    <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-6">
      <div className="text-sm font-medium text-ink">
        {workshopName ?? <span className="text-ink-muted">&nbsp;</span>}
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Link href="/profile" className="text-sm text-ink-secondary hover:text-ink hover:underline">
          {displayName}
        </Link>
        <Button variant="ghost" size="sm" onClick={handleLogout} isLoading={isLoggingOut}>
          Log out
        </Button>
      </div>
    </header>
  );
}
