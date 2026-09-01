import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api-client';
import type { TrialStatus } from '@/lib/api-types';

/**
 * GET /tenants/me/trial-status has no @Permissions() gate — unlike
 * GET /tenants/me (see useCurrentTenant's own doc comment on why most
 * roles 403 there), this one is deliberately reachable by every
 * authenticated staff member, so the trial chip/banner shows for whoever's
 * logged in, not just the Workshop Owner. Called independently from
 * wherever it's needed (Topbar chip, dashboard banner) — same small-
 * duplicate-request-over-shared-cache precedent useCurrentTenant already
 * established in this codebase.
 */
export function useTrialStatus(): TrialStatus | null {
  const [status, setStatus] = useState<TrialStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<TrialStatus>('/tenants/me/trial-status')
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        // Never surface an error for this — a missing trial chip/banner isn't worth an error state.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
