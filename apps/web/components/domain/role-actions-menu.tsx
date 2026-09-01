'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MoreVertical } from 'lucide-react';
import { usePermission } from '@/lib/hooks/use-permission';
import { useMenuPosition } from '@/lib/hooks/use-menu-position';
import type { Role } from '@/lib/api-types';

interface RoleActionsMenuProps {
  role: Pick<Role, 'id' | 'name' | 'isSystem'>;
  /** Parent owns the confirmation modal (it already has the assigned-user count from GET /users) and the actual DELETE call. */
  onDeleteRequested: () => void;
}

/**
 * View Role / Edit Role (both → the combined /roles/:id page) / Delete
 * Role. System roles disable Edit/Delete with a tooltip, mirroring
 * RolesService's own ForbiddenException — no role hits this path today
 * (every role, including defaults, is created with isSystem: false), but
 * the guard stays in place defensively.
 */
export function RoleActionsMenu({ role, onDeleteRequested }: RoleActionsMenuProps) {
  const canUpdate = usePermission('role:update');
  const canDelete = usePermission('role:delete');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const position = useMenuPosition(triggerRef, isOpen, () => setIsOpen(false));

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((v) => !v);
        }}
        aria-label="Role actions"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="More actions"
        className="flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:bg-surface-hover hover:text-ink"
      >
        <MoreVertical className="h-3.5 w-3.5" aria-hidden />
      </button>

      {isOpen && position ? (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{ top: position.top, right: position.right }}
          className="fixed z-30 w-44 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-card"
        >
          <Link href={`/roles/${role.id}`} role="menuitem" className="block px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover" onClick={() => setIsOpen(false)}>
            View Role
          </Link>
          {canUpdate ? (
            role.isSystem ? (
              <span className="block cursor-not-allowed px-3 py-1.5 text-left text-xs text-ink-muted" title="System roles can't be modified">
                Edit Role
              </span>
            ) : (
              <Link href={`/roles/${role.id}`} role="menuitem" className="block px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover" onClick={() => setIsOpen(false)}>
                Edit Role
              </Link>
            )
          ) : null}
          {canDelete ? (
            <>
              <div className="my-1 border-t border-line" />
              {role.isSystem ? (
                <span className="block cursor-not-allowed px-3 py-1.5 text-left text-xs text-ink-muted" title="System roles can't be deleted">
                  Delete Role
                </span>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsOpen(false);
                    onDeleteRequested();
                  }}
                  className="block w-full px-3 py-1.5 text-left text-xs text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-500/10"
                >
                  Delete Role
                </button>
              )}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
