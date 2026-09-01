import { describe, expect, it } from 'vitest';
import { computeRoleStats, describeRole } from './role-stats';

function perm(resource: string, action: string) {
  return { permission: { id: `${resource}:${action}`, resource, action } };
}

describe('computeRoleStats', () => {
  it('computes total/modules/read/write that sum correctly', () => {
    const role = {
      permissions: [
        perm('customer', 'create'),
        perm('customer', 'read'),
        perm('customer', 'update'),
        perm('vehicle', 'read'),
      ],
    };
    const stats = computeRoleStats(role);
    expect(stats.total).toBe(4);
    expect(stats.modules).toBe(2);
    expect(stats.read).toBe(2);
    expect(stats.write).toBe(2);
    expect(stats.read + stats.write).toBe(stats.total);
  });

  it('returns all zeros for a role with no permissions', () => {
    expect(computeRoleStats({ permissions: [] })).toEqual({ total: 0, modules: 0, read: 0, write: 0 });
  });
});

describe('describeRole', () => {
  it('describes a role with permissions', () => {
    const role = { permissions: [perm('customer', 'read'), perm('vehicle', 'read')] };
    expect(describeRole(role)).toBe('2 permissions across 2 modules');
  });

  it('handles the singular case', () => {
    const role = { permissions: [perm('customer', 'read')] };
    expect(describeRole(role)).toBe('1 permission across 1 module');
  });

  it('handles no permissions', () => {
    expect(describeRole({ permissions: [] })).toBe('No permissions granted');
  });
});
