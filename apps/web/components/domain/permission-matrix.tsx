'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import type { Permission } from '@/lib/api-types';
import { labelForResource } from '@/lib/roles/resource-labels';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const ACTION_LABELS: Record<string, string> = { create: 'Create', read: 'Read', update: 'Update', delete: 'Delete' };
const ACTION_ORDER = ['create', 'read', 'update', 'delete'];

interface ModuleGroup {
  resource: string;
  label: string;
  permissions: Permission[];
}

interface PermissionMatrixProps {
  /** The full GET /permissions catalogue — every resource × action that could be granted. */
  permissions: Permission[];
  selectedIds: string[];
  onChange?: (ids: string[]) => void;
  /** View-only mode — renders ✓/— indicators instead of checkboxes, hides Select All/Clear/per-module controls. Used for role:read-only viewers and system roles. */
  readOnly?: boolean;
}

/**
 * Resource × action permission picker, grouped by module (one row per real
 * `resource` string — flat, matching the actual permission model; there is
 * no parent/child module hierarchy in the data). Each module row is
 * independently expandable/collapsible; a search filters modules by label.
 */
export function PermissionMatrix({ permissions, selectedIds, onChange, readOnly = false }: PermissionMatrixProps) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const groups: ModuleGroup[] = useMemo(() => {
    const byResource = new Map<string, Permission[]>();
    for (const p of permissions) {
      const list = byResource.get(p.resource) ?? [];
      list.push(p);
      byResource.set(p.resource, list);
    }
    return Array.from(byResource.entries())
      .map(([resource, perms]) => ({
        resource,
        label: labelForResource(resource),
        permissions: perms.sort((a, b) => ACTION_ORDER.indexOf(a.action) - ACTION_ORDER.indexOf(b.action)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [permissions]);

  const visibleGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.label.toLowerCase().includes(q));
  }, [groups, search]);

  const selectedSet = new Set(selectedIds);
  const totalCount = permissions.length;
  const selectedCount = selectedIds.length;

  function toggle(id: string) {
    if (readOnly || !onChange) return;
    onChange(selectedSet.has(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id]);
  }

  function selectAll() {
    if (!onChange) return;
    onChange(permissions.map((p) => p.id));
  }

  function clearAll() {
    if (!onChange) return;
    onChange([]);
  }

  function selectModule(group: ModuleGroup) {
    if (!onChange) return;
    const ids = new Set(selectedIds);
    group.permissions.forEach((p) => ids.add(p.id));
    onChange(Array.from(ids));
  }

  function clearModule(group: ModuleGroup) {
    if (!onChange) return;
    const moduleIds = new Set(group.permissions.map((p) => p.id));
    onChange(selectedIds.filter((id) => !moduleIds.has(id)));
  }

  function toggleCollapsed(resource: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(resource)) next.delete(resource);
      else next.add(resource);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-ink">
            Selected Permissions: <span className="num">{selectedCount}</span> / <span className="num">{totalCount}</span>
          </span>
          {!readOnly ? (
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            </div>
          ) : null}
        </div>
        <ProgressBar value={totalCount === 0 ? 0 : (selectedCount / totalCount) * 100} />
      </div>

      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search permissions..." aria-label="Search permissions" />

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-hover/40">
              <th className="px-3 py-2 text-micro font-semibold uppercase tracking-wide text-ink-secondary">Module / Resource</th>
              {ACTION_ORDER.map((action) => (
                <th key={action} className="px-3 py-2 text-center text-micro font-semibold uppercase tracking-wide text-ink-secondary">
                  {ACTION_LABELS[action]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visibleGroups.map((group) => {
              const moduleSelectedCount = group.permissions.filter((p) => selectedSet.has(p.id)).length;
              const isCollapsed = collapsed.has(group.resource);
              return (
                <tr key={group.resource} className="align-middle">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCollapsed(group.resource)}
                        aria-label={isCollapsed ? `Expand ${group.label}` : `Collapse ${group.label}`}
                        className="text-ink-muted hover:text-ink"
                      >
                        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
                      </button>
                      <span className="text-ink">{group.label}</span>
                      <span className="text-xs text-ink-muted">
                        {moduleSelectedCount}/{group.permissions.length}
                      </span>
                      {!readOnly ? (
                        <div className="ml-1 flex gap-1">
                          <button type="button" onClick={() => selectModule(group)} className="text-xs text-accent-600 hover:underline dark:text-accent-400">
                            Select all
                          </button>
                          <span className="text-xs text-ink-muted">·</span>
                          <button type="button" onClick={() => clearModule(group)} className="text-xs text-ink-muted hover:underline">
                            Clear
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                  {ACTION_ORDER.map((action) => {
                    if (isCollapsed) return <td key={action} className="px-3 py-2" />;
                    const permission = group.permissions.find((p) => p.action === action);
                    if (!permission) return <td key={action} className="px-3 py-2" />;
                    const isSelected = selectedSet.has(permission.id);
                    return (
                      <td key={action} className="px-3 py-2 text-center">
                        {readOnly ? (
                          isSelected ? (
                            <Check className="mx-auto h-4 w-4 text-success-600 dark:text-success-400" aria-label="Allowed" />
                          ) : (
                            <span className="text-ink-muted" aria-label="Not allowed">
                              &mdash;
                            </span>
                          )
                        ) : (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggle(permission.id)}
                            className="h-4 w-4 rounded border-line"
                            aria-label={`${group.label}: ${ACTION_LABELS[action]}`}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {visibleGroups.length === 0 ? (
              <tr>
                <td colSpan={ACTION_ORDER.length + 1} className="px-3 py-6 text-center text-sm text-ink-muted">
                  No modules match &ldquo;{search}&rdquo;.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
