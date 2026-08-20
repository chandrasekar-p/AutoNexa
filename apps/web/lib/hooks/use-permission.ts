'use client';

import { useAuth } from '../auth/auth-context';

/**
 * UX-only convenience — hides nav items / actions the user's role doesn't
 * grant. This is NOT the security boundary: the backend enforces every
 * `@Permissions(...)` server-side on every route regardless of what the
 * client shows or hides. Never rely on this for anything sensitive.
 */
export function usePermission(permission: string): boolean {
  const { user } = useAuth();
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  return user.permissions.includes(permission);
}

/** Same caveat as usePermission — true if the user has ANY `${resource}:*` grant. */
export function useHasResourceAccess(resource: string): boolean {
  const { user } = useAuth();
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  const prefix = `${resource}:`;
  return user.permissions.some((p) => p.startsWith(prefix));
}
