'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MoreVertical } from 'lucide-react';
import { apiPatch, ApiError } from '@/lib/api-client';
import { usePermission } from '@/lib/hooks/use-permission';
import { useMenuPosition } from '@/lib/hooks/use-menu-position';
import type { PurchaseOrderListItem } from '@/lib/api-types';

// Mirrors the backend's PURCHASE_ORDER_STATUS_TRANSITIONS (CANCELLED is
// only reachable from DRAFT/SENT) — same simple check the existing detail
// page already used, not a full transition-table duplicate.
const CANCELLABLE_STATUSES: PurchaseOrderListItem['status'][] = ['DRAFT', 'SENT'];

interface PurchaseOrderActionsMenuProps {
  po: Pick<PurchaseOrderListItem, 'id' | 'poNumber' | 'status'>;
  onChanged: () => void;
  onError: (message: string) => void;
}

/** View / Cancel Order (only when the backend would actually accept the transition) / View Purchase Invoice (jump link) / Print. No generated PDF exists for purchase orders — Print opens the browser's native print dialog on the rendered detail page. */
export function PurchaseOrderActionsMenu({ po, onChanged, onError }: PurchaseOrderActionsMenuProps) {
  const canUpdate = usePermission('purchase:update');
  const [isOpen, setIsOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
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

  async function handleCancel() {
    if (!window.confirm(`Cancel purchase order ${po.poNumber}?`)) return;
    setIsOpen(false);
    setIsCancelling(true);
    try {
      await apiPatch(`/purchase-orders/${po.id}`, { status: 'CANCELLED' });
      onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not cancel this purchase order.');
    } finally {
      setIsCancelling(false);
    }
  }

  const canCancel = canUpdate && CANCELLABLE_STATUSES.includes(po.status);

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
        disabled={isCancelling}
        aria-label="Purchase order actions"
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
          <Link href={`/purchases/${po.id}`} role="menuitem" className="block px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover" onClick={() => setIsOpen(false)}>
            View Purchase Order
          </Link>
          <Link href={`/purchases/${po.id}#invoices`} role="menuitem" className="block px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover" onClick={() => setIsOpen(false)}>
            View Purchase Invoice
          </Link>
          {canCancel ? (
            <>
              <div className="my-1 border-t border-line" />
              <button
                type="button"
                role="menuitem"
                onClick={handleCancel}
                className="block w-full px-3 py-1.5 text-left text-xs text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-500/10"
              >
                Cancel Order
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
