'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MoreVertical } from 'lucide-react';
import { apiDelete, apiPatch, ApiError } from '@/lib/api-client';
import { usePermission } from '@/lib/hooks/use-permission';
import { useMenuPosition } from '@/lib/hooks/use-menu-position';
import type { ServicePackage } from '@/lib/api-types';

interface ServicePackageActionsMenuProps {
  pkg: Pick<ServicePackage, 'id' | 'name' | 'isActive' | 'stats'>;
  onChanged: () => void;
  onError: (message: string) => void;
  /** Detail page passes true so a successful delete can navigate away — list page just refetches in place. */
  onDeleted?: () => void;
}

/**
 * View / Edit / Activate-or-Deactivate / Delete. Delete only ever appears
 * when `stats` is present AND shows zero sold instances (see
 * ServicePackagesService.remove()'s matching backend guard) — list rows
 * carry no `stats` (see api-types.ts), so this menu simply never offers
 * Delete there. No "Sell Package" item — selling happens from the
 * Customer detail page's own package card, not this catalogue.
 */
export function ServicePackageActionsMenu({ pkg, onChanged, onError, onDeleted }: ServicePackageActionsMenuProps) {
  const canUpdate = usePermission('service-package:update');
  const canDelete = usePermission('service-package:delete');
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
    setIsOpen(false);
    setIsUpdatingStatus(true);
    try {
      await apiPatch(`/service-packages/${pkg.id}`, { isActive: !pkg.isActive });
      onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not update this package.');
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${pkg.name}"? This cannot be undone from here.`)) return;
    setIsOpen(false);
    setIsDeleting(true);
    try {
      await apiDelete(`/service-packages/${pkg.id}`);
      if (onDeleted) onDeleted();
      else onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not delete this package.');
    } finally {
      setIsDeleting(false);
    }
  }

  const canDeleteThisOne = canDelete && pkg.stats && pkg.stats.soldCount === 0;

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
        disabled={isUpdatingStatus || isDeleting}
        aria-label="Package actions"
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
          className="fixed z-30 w-48 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-card"
        >
          <Link href={`/service-packages/${pkg.id}`} role="menuitem" className="block px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover" onClick={() => setIsOpen(false)}>
            View Package
          </Link>
          {canUpdate ? (
            <Link href={`/service-packages/${pkg.id}/edit`} role="menuitem" className="block px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover" onClick={() => setIsOpen(false)}>
              Edit Package
            </Link>
          ) : null}
          {canUpdate ? (
            <>
              <div className="my-1 border-t border-line" />
              <button type="button" role="menuitem" onClick={handleToggleActive} className="block w-full px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover">
                {pkg.isActive ? 'Deactivate Package' : 'Activate Package'}
              </button>
            </>
          ) : null}
          {canDeleteThisOne ? (
            <button
              type="button"
              role="menuitem"
              onClick={handleDelete}
              className="block w-full px-3 py-1.5 text-left text-xs text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-500/10"
            >
              Delete Package
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
