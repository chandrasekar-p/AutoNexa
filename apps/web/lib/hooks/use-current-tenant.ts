import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api-client';
import type { CurrentTenant } from '@/lib/api-types';

/**
 * GET /tenants/me requires `tenant:read`, which only Workshop Owner (and
 * Super Admin) get by default (see default-role-grants.ts) — most other
 * roles will 403 here. That's expected, not a bug: this fetch fails
 * silently and callers just don't get a tenant, rather than breaking the
 * shell over a permission most roles don't have. Called independently
 * from both Sidebar and Topbar (a small duplicate request, not a shared
 * cache) — same as how usePermission() is called ad hoc in many places
 * rather than hoisted, consistent with this codebase's existing pattern.
 */
export function useCurrentTenant(): CurrentTenant | null {
  const [tenant, setTenant] = useState<CurrentTenant | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<CurrentTenant>('/tenants/me')
      .then((data) => {
        if (!cancelled) setTenant(data);
      })
      .catch(() => {
        // Expected for most roles — see doc comment above.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return tenant;
}
