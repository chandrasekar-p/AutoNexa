'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch, refreshAccessToken, setAccessToken, setUnauthorizedHandler } from '../api-client';
import type { AuthUser, LoginResponse, MeResponse } from './types';

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (tenantSlug: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Called by the profile page after a successful PATCH /users/me so the topbar/sidebar reflect a name change immediately, without a reload. */
  setUserName: (name: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessTokenState, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyToken = useCallback((token: string | null) => {
    setAccessTokenState(token);
    setAccessToken(token);
  }, []);

  const clearAuth = useCallback(() => {
    applyToken(null);
    setUser(null);
  }, [applyToken]);

  // Registered once so the api-client can clear auth + let the dashboard
  // layout's redirect take over, without api-client importing this module
  // (that would be circular — this module already imports api-client).
  useEffect(() => {
    setUnauthorizedHandler(clearAuth);
    return () => setUnauthorizedHandler(null);
  }, [clearAuth]);

  // Silent refresh on mount: a page reload has no in-memory access token,
  // only the httpOnly refresh cookie (if the session is still valid). This
  // is the ONLY place a reload doesn't force re-login.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = await refreshAccessToken();
      if (cancelled) return;
      if (!token) {
        clearAuth();
        setIsLoading(false);
        return;
      }
      applyToken(token);
      try {
        const me = await apiFetch<MeResponse>('/auth/me');
        if (cancelled) return;
        // Best-effort — GET /auth/me is decoded straight off the JWT and
        // never carries `name`, so this second call is what makes the
        // display name survive a page reload. Not fatal if it fails: the
        // session itself is still valid off /auth/me alone, and Topbar
        // falls back to email when `name` is undefined.
        let name: string | undefined;
        try {
          const profile = await apiFetch<{ name: string }>('/users/me');
          name = profile.name;
        } catch {
          // Non-fatal — see comment above.
        }
        if (!cancelled) setUser({ ...me, name });
      } catch {
        if (!cancelled) clearAuth();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (tenantSlug: string, email: string, password: string) => {
      const data = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: { tenantSlug, email, password },
      });
      applyToken(data.accessToken);
      // The login response's `user` has name/email/roles but not the
      // flattened permissions array — that only comes from /auth/me.
      const me = await apiFetch<MeResponse>('/auth/me');
      setUser({ ...me, name: data.user.name });
    },
    [applyToken],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Even if the network call fails, still clear local state below —
      // there's nothing else useful to do with a failed logout call.
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const setUserName = useCallback((name: string) => {
    setUser((prev) => (prev ? { ...prev, name } : prev));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, accessToken: accessTokenState, isLoading, login, logout, setUserName }),
    [user, accessTokenState, isLoading, login, logout, setUserName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
