'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { usePermission } from '@/lib/hooks/use-permission';
import { useMenuPosition } from '@/lib/hooks/use-menu-position';

interface AttendanceActionsMenuProps {
  canRemove: boolean;
  onView: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

/** View (always) / Edit (attendance:update) / Remove (attendance:delete, and only when the row itself allows it — e.g. not mid-delete). */
export function AttendanceActionsMenu({ canRemove, onView, onEdit, onRemove }: AttendanceActionsMenuProps) {
  const canUpdate = usePermission('attendance:update');
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
        aria-label="Attendance record actions"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:bg-surface-hover hover:text-ink"
      >
        <MoreVertical className="h-3.5 w-3.5" aria-hidden />
      </button>

      {isOpen && position ? (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{ top: position.top, right: position.right }}
          className="fixed z-30 w-40 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-card"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onView();
            }}
            className="block w-full px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover"
          >
            View
          </button>
          {canUpdate ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onEdit();
              }}
              className="block w-full px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover"
            >
              Edit
            </button>
          ) : null}
          {canRemove ? (
            <>
              <div className="my-1 border-t border-line" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  onRemove();
                }}
                className="block w-full px-3 py-1.5 text-left text-xs text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-500/10"
              >
                Remove
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
