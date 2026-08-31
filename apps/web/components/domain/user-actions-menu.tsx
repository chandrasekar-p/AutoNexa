'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MoreVertical } from 'lucide-react';
import { apiPatch, ApiError } from '@/lib/api-client';
import { usePermission } from '@/lib/hooks/use-permission';
import { useAuth } from '@/lib/auth/auth-context';
import { useMenuPosition } from '@/lib/hooks/use-menu-position';
import type { AppUser } from '@/lib/api-types';

interface UserActionsMenuProps {
  user: Pick<AppUser, 'id' | 'name' | 'isActive'>;
  onChanged: () => void;
  onError: (message: string) => void;
}

/**
 * View User / Edit User (both the same combined detail+edit page — see
 * users/[id]/page.tsx's own view-vs-edit split by permission) / Manage
 * Roles (deep-links to that page's Roles & Access section) /
 * Deactivate-or-Activate. Deactivate/Activate both go through
 * PATCH /users/:id {isActive} — never DELETE, which soft-deletes the user
 * out of every list permanently (see UsersService.remove()'s own
 * deletedAt filter interaction) and is not what a reversible status
 * toggle should do.
 */
export function UserActionsMenu({ user, onChanged, onError }: UserActionsMenuProps) {
  const canUpdate = usePermission('user:update');
  const { user: currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
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

  async function handleToggleActive() {
    if (user.isActive && !window.confirm(`Deactivate User?\n\nAre you sure you want to deactivate ${user.name}? They will no longer be able to access AutoNexa.`)) {
      return;
    }
    setIsOpen(false);
    setIsUpdatingStatus(true);
    try {
      await apiPatch(`/users/${user.id}`, { isActive: !user.isActive });
      onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not update this user.');
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  const isSelf = user.id === currentUser?.userId;

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
        disabled={isUpdatingStatus}
        aria-label="User actions"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:bg-surface-hover hover:text-ink disabled:opacity-50"
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
          <Link href={`/users/${user.id}`} role="menuitem" className="block px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover" onClick={() => setIsOpen(false)}>
            View User
          </Link>
          {canUpdate ? (
            <>
              <Link href={`/users/${user.id}`} role="menuitem" className="block px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover" onClick={() => setIsOpen(false)}>
                Edit User
              </Link>
              <Link href={`/users/${user.id}#roles`} role="menuitem" className="block px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover" onClick={() => setIsOpen(false)}>
                Manage Roles
              </Link>
            </>
          ) : null}
          {canUpdate && !isSelf ? (
            <>
              <div className="my-1 border-t border-line" />
              <button
                type="button"
                role="menuitem"
                onClick={handleToggleActive}
                className={
                  user.isActive
                    ? 'block w-full px-3 py-1.5 text-left text-xs text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-500/10'
                    : 'block w-full px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover'
                }
              >
                {user.isActive ? 'Deactivate User' : 'Activate User'}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
