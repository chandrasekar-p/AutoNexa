import type { Role } from '@/lib/api-types';

export interface RoleStats {
  total: number;
  modules: number;
  read: number;
  write: number;
}

/** Pure, computed from a role's actual granted permissions — never a stored field. Read + write always sum to total (the reference mock's own numbers didn't). */
export function computeRoleStats(role: Pick<Role, 'permissions'>): RoleStats {
  const total = role.permissions.length;
  const modules = new Set(role.permissions.map((p) => p.permission.resource)).size;
  const read = role.permissions.filter((p) => p.permission.action === 'read').length;
  return { total, modules, read, write: total - read };
}

/** "{N} permissions across {M} modules" — Role has no stored description field, so the list/detail "Description" is this computed summary instead, never invented prose. */
export function describeRole(role: Pick<Role, 'permissions'>): string {
  const { total, modules } = computeRoleStats(role);
  if (total === 0) return 'No permissions granted';
  return `${total} permission${total === 1 ? '' : 's'} across ${modules} module${modules === 1 ? '' : 's'}`;
}
