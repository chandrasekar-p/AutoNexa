'use client';

import { useAuth } from '../auth/auth-context';
import type { AuthUser } from '../auth/types';

/**
 * UX-only convenience — hides nav items / actions the user's role doesn't
 * grant. This is NOT the security boundary: the backend enforces every
 * `@Permissions(...)` server-side on every route regardless of what the
 * client shows or hides. Never rely on this for anything sensitive.
 */
export function usePermission(permission: string): boolean {
  const { user } = useAuth();
  return hasPermission(user, permission);
}

/** Same caveat as usePermission — true if the user has ANY `${resource}:*` grant. */
export function useHasResourceAccess(resource: string): boolean {
  const { user } = useAuth();
  return hasResourceAccess(user, resource);
}

/**
 * Plain (non-hook) versions of the two checks above — for callers that
 * already have the user object from a single `useAuth()` call and want to
 * filter a list without one hook invocation per item (e.g. Sidebar grouping
 * nav items into sections). Same UX-only caveat applies.
 */
export function hasPermission(user: AuthUser | null, permission: string): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  return user.permissions.includes(permission);
}

export function hasResourceAccess(user: AuthUser | null, resource: string): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  const prefix = `${resource}:`;
  return user.permissions.some((p) => p.startsWith(prefix));
}
