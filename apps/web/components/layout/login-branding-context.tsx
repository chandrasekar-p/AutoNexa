'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiGet } from '@/lib/api-client';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import type { TenantBranding } from '@/lib/api-types';

interface LoginBrandingContextValue {
  setTenantSlug: (slug: string) => void;
  backgroundUrl: string | null;
}

const LoginBrandingContext = createContext<LoginBrandingContextValue | undefined>(undefined);

/**
 * Bridges the login page's Workshop ID input (which knows the typed slug)
 * and the layout's LoginBackdrop (a sibling, not a child — App Router
 * layouts/pages can't pass props to each other directly). Fetches
 * GET /tenants/branding/:slug — public, pre-auth — as the slug settles,
 * and silently ignores failures/unknown slugs: a missing wallpaper is
 * never worth surfacing an error on the sign-in screen.
 */
export function LoginBrandingProvider({ children }: { children: ReactNode }) {
  const [tenantSlug, setTenantSlug] = useState('');
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const debouncedSlug = useDebouncedValue(tenantSlug, 400);

  useEffect(() => {
    const slug = debouncedSlug.trim();
    if (!slug) {
      setBackgroundUrl(null);
      return;
    }
    let cancelled = false;
    apiGet<TenantBranding>(`/tenants/branding/${encodeURIComponent(slug)}`)
      .then((branding) => {
        if (!cancelled) setBackgroundUrl(branding.loginBackgroundUrl);
      })
      .catch(() => {
        if (!cancelled) setBackgroundUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSlug]);

  const value = useMemo(() => ({ setTenantSlug, backgroundUrl }), [backgroundUrl]);

  return <LoginBrandingContext.Provider value={value}>{children}</LoginBrandingContext.Provider>;
}

export function useSetLoginTenantSlug(): (slug: string) => void {
  const ctx = useContext(LoginBrandingContext);
  if (!ctx) throw new Error('useSetLoginTenantSlug must be used within LoginBrandingProvider');
  return ctx.setTenantSlug;
}

export function useLoginBranding(): { backgroundUrl: string | null } {
  const ctx = useContext(LoginBrandingContext);
  if (!ctx) throw new Error('useLoginBranding must be used within LoginBrandingProvider');
  return { backgroundUrl: ctx.backgroundUrl };
}
