'use client';

import { useLayoutEffect, useState, type RefObject } from 'react';

export interface MenuPosition {
  top: number;
  right: number;
}

/**
 * Fixed-viewport coordinates for a right-aligned dropdown anchored under
 * `triggerRef`'s button. Every actions-menu in this app (Parts, Job Cards,
 * Technicians, Invoices, Suppliers, the dashboard's Today's Workshop row
 * menu) used to position its dropdown with `absolute right-0 top-full`
 * inside a `relative` wrapper — which silently clipped at any scrollable
 * ancestor's edge (a table's own horizontal-scroll wrapper, a Kanban
 * board's column scroller, ...). That's a real CSS spec behavior, not a
 * bug in those wrappers: setting overflow-x to a scrolling value forces
 * the computed overflow-y to 'auto' too even when overflow-y is written
 * as 'visible' in the stylesheet — there is no CSS-only escape hatch.
 * `position: fixed`, computed here from the trigger's real screen
 * position, is laid out relative to the viewport instead and so escapes
 * every one of those ancestors (none of them use transform/filter/
 * contain, which would otherwise re-trap a fixed descendant) without
 * needing a portal.
 *
 * Recomputed each time the menu opens; closes on scroll/resize via
 * `onRequestClose` rather than trying to re-track the trigger's position,
 * since a menu that silently drifts away from its button while the page
 * scrolls is worse than one that just closes.
 */
export function useMenuPosition(
  triggerRef: RefObject<HTMLElement>,
  isOpen: boolean,
  onRequestClose: () => void,
): MenuPosition | null {
  const [position, setPosition] = useState<MenuPosition | null>(null);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) {
      setPosition(null);
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });

    function handleScrollOrResize() {
      onRequestClose();
    }
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return position;
}
