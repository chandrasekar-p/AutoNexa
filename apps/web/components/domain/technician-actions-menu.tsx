'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MoreVertical } from 'lucide-react';
import { apiPatch, ApiError } from '@/lib/api-client';
import { useMenuPosition } from '@/lib/hooks/use-menu-position';
import type { TechnicianStatus } from '@/lib/api-types';

const STATUS_LABEL: Record<TechnicianStatus, string> = { ACTIVE: 'Active', ON_LEAVE: 'On Leave', INACTIVE: 'Inactive' };

interface TechnicianActionsMenuProps {
  technicianId: string;
  status: TechnicianStatus;
  canUpdate: boolean;
  onStatusChanged: () => void;
  onError: (message: string) => void;
}

/**
 * View Profile / Edit / View Jobs / Change Status — deliberately doesn't
 * include "Assign Job": no page in this app accepts a technicianId
 * preselect today (job-cards/new only reads customerId/vehicleId), so
 * linking there would either silently drop the intent or require a
 * separate feature build. Change Status is the one write action offered
 * inline (a real PATCH /technicians/:id, same endpoint the Edit form
 * uses) since it's the single most common quick action a manager takes
 * from the list without opening the full edit form.
 */
export function TechnicianActionsMenu({ technicianId, status, canUpdate, onStatusChanged, onError }: TechnicianActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [statusSubmenuOpen, setStatusSubmenuOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const position = useMenuPosition(triggerRef, isOpen, () => setIsOpen(false));

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setStatusSubmenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  async function changeStatus(next: TechnicianStatus) {
    setIsChanging(true);
    setIsOpen(false);
    setStatusSubmenuOpen(false);
    try {
      await apiPatch(`/technicians/${technicianId}`, { status: next });
      onStatusChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not update this technician.');
    } finally {
      setIsChanging(false);
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
        disabled={isChanging}
        aria-label="Technician actions"
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
          className="fixed z-30 w-48 overflow-visible rounded-md border border-line bg-surface py-1 shadow-card"
        >
          <Link href={`/technicians/${technicianId}`} role="menuitem" className="block px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover" onClick={() => setIsOpen(false)}>
            View Profile
          </Link>
          {canUpdate ? (
            <Link href={`/technicians/${technicianId}/edit`} role="menuitem" className="block px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover" onClick={() => setIsOpen(false)}>
              Edit Technician
            </Link>
          ) : null}
          <Link
            href={`/job-cards?technicianId=${technicianId}`}
            role="menuitem"
            className="block px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover"
            onClick={() => setIsOpen(false)}
          >
            View Jobs
          </Link>

          {canUpdate ? (
            <div className="relative">
              <button
                type="button"
                role="menuitem"
                onClick={() => setStatusSubmenuOpen((v) => !v)}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover"
              >
                Change Status
                <span className="text-ink-muted">›</span>
              </button>
              {statusSubmenuOpen ? (
                <div className="absolute right-full top-0 z-40 w-32 rounded-md border border-line bg-surface py-1 shadow-card">
                  {(['ACTIVE', 'ON_LEAVE', 'INACTIVE'] as TechnicianStatus[])
                    .filter((s) => s !== status)
                    .map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="menuitem"
                        onClick={() => void changeStatus(s)}
                        className="block w-full px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover"
                      >
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
