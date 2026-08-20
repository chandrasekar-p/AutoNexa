'use client';

import type { Permission } from '@/lib/api-types';

interface PermissionGridProps {
  permissions: Permission[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

/** Resource × action checkbox grid for role creation/editing — GET /permissions is the master catalogue (see PermissionsService). */
export function PermissionGrid({ permissions, selectedIds, onChange, disabled }: PermissionGridProps) {
  const resources = [...new Set(permissions.map((p) => p.resource))].sort();
  const actions = [...new Set(permissions.map((p) => p.action))].sort();
  const byResourceAction = new Map(permissions.map((p) => [`${p.resource}:${p.action}`, p]));

  function toggle(id: string) {
    if (disabled) return;
    onChange(selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id]);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line">
            <th className="px-3 py-2 text-micro font-semibold uppercase tracking-wide text-ink-secondary">Resource</th>
            {actions.map((action) => (
              <th key={action} className="px-3 py-2 text-center text-micro font-semibold uppercase tracking-wide text-ink-secondary">
                {action}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {resources.map((resource) => (
            <tr key={resource}>
              <td className="px-3 py-2 text-ink">{resource}</td>
              {actions.map((action) => {
                const permission = byResourceAction.get(`${resource}:${action}`);
                if (!permission) return <td key={action} className="px-3 py-2" />;
                return (
                  <td key={action} className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(permission.id)}
                      onChange={() => toggle(permission.id)}
                      disabled={disabled}
                      className="h-4 w-4 rounded border-line"
                      aria-label={`${resource}:${action}`}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
