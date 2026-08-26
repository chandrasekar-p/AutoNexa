import { TechnicianCard } from './technician-card';
import type { Technician, TechnicianAvailability } from '@/lib/api-types';

const COLUMNS: { key: TechnicianAvailability; label: string }[] = [
  { key: 'AVAILABLE', label: 'Available' },
  { key: 'ON_JOB', label: 'On Job' },
  { key: 'ON_LEAVE', label: 'On Leave' },
  { key: 'INACTIVE', label: 'Inactive' },
];

interface TechnicianBoardProps {
  items: Technician[];
  canUpdate: boolean;
  onStatusChanged: () => void;
  onError: (message: string) => void;
}

/** No drag-and-drop — status changes go through Change Status/Edit, matching the spec's explicit "don't introduce drag-and-drop" guard for this module. */
export function TechnicianBoard({ items, canUpdate, onStatusChanged, onError }: TechnicianBoardProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {COLUMNS.map((column) => {
        const columnItems = items.filter((t) => t.availability === column.key);
        return (
          <div key={column.key} className="flex w-[280px] shrink-0 flex-col rounded-lg border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">{column.label}</span>
              <span className="num text-xs font-medium text-ink-muted">{columnItems.length}</span>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-2">
              {columnItems.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-ink-muted">No technicians</p>
              ) : (
                columnItems.map((t) => (
                  <TechnicianCard key={t.id} technician={t} canUpdate={canUpdate} onStatusChanged={onStatusChanged} onError={onError} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
