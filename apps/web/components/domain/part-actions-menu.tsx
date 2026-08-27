'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MoreVertical } from 'lucide-react';
import { apiPatch, ApiError } from '@/lib/api-client';
import { usePermission } from '@/lib/hooks/use-permission';
import { useMenuPosition } from '@/lib/hooks/use-menu-position';
import type { Part } from '@/lib/api-types';

interface PartActionsMenuProps {
  part: Pick<Part, 'id' | 'name' | 'currentStock' | 'supplierId' | 'isActive'>;
  onAdjustStock: () => void;
  onChanged: () => void;
  onError: (message: string) => void;
}

/**
 * View Part / Edit Part / Stock Adjustment / Stock History / View
 * Supplier / Create Purchase Order / Deactivate. "Purchase History" from
 * the spec isn't a separate item here — the Stock History view (the
 * existing stock ledger) already contains every PURCHASE_IN row with
 * refType 'PurchaseOrder', so a second purchase-only view would just be a
 * filtered subset of the same table.
 */
export function PartActionsMenu({ part, onAdjustStock, onChanged, onError }: PartActionsMenuProps) {
  const canUpdate = usePermission('part:update');
  const canAdjustStock = usePermission('inventory:update');
  const canCreatePurchase = usePermission('purchase:create');
  const [isOpen, setIsOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
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

  async function handleDeactivate() {
    if (!window.confirm(`Deactivate "${part.name}"? It can be reactivated later from Edit Part.`)) return;
    setIsDeactivating(true);
    setIsOpen(false);
    try {
      await apiPatch(`/parts/${part.id}`, { isActive: false });
      onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not deactivate this part.');
    } finally {
      setIsDeactivating(false);
    }
  }

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
        disabled={isDeactivating}
        aria-label="Part actions"
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
          <Link href={`/parts-inventory/${part.id}`} role="menuitem" className="block px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover" onClick={() => setIsOpen(false)}>
            View Part
          </Link>
          {canUpdate ? (
            <Link href={`/parts-inventory/${part.id}/edit`} role="menuitem" className="block px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover" onClick={() => setIsOpen(false)}>
              Edit Part
            </Link>
          ) : null}
          {canAdjustStock ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onAdjustStock();
              }}
              className="block w-full px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover"
            >
              Stock Adjustment
            </button>
          ) : null}
          <Link href={`/parts-inventory/${part.id}#stock-history`} role="menuitem" className="block px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover" onClick={() => setIsOpen(false)}>
            Stock History
          </Link>
          {part.supplierId ? (
            <Link href={`/suppliers/${part.supplierId}`} role="menuitem" className="block px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover" onClick={() => setIsOpen(false)}>
              View Supplier
            </Link>
          ) : null}
          {canCreatePurchase ? (
            <Link
              href={`/purchases/new?partId=${part.id}`}
              role="menuitem"
              className="block px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover"
              onClick={() => setIsOpen(false)}
            >
              Create Purchase Order
            </Link>
          ) : null}
          {canUpdate && part.isActive ? (
            <>
              <div className="my-1 border-t border-line" />
              <button
                type="button"
                role="menuitem"
                onClick={handleDeactivate}
                className="block w-full px-3 py-1.5 text-left text-xs text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-500/10"
              >
                Deactivate
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
