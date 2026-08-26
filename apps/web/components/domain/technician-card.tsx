import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { WorkloadBar } from './workload-bar';
import { TechnicianAvailabilityBadge } from './technician-availability-badge';
import { TechnicianActionsMenu } from './technician-actions-menu';
import type { Technician } from '@/lib/api-types';

interface TechnicianCardProps {
  technician: Technician;
  canUpdate: boolean;
  onStatusChanged: () => void;
  onError: (message: string) => void;
}

/** Used both for Board columns and as the mobile-width replacement for a table row — same compact, scannable layout either way. */
export function TechnicianCard({ technician, canUpdate, onStatusChanged, onError }: TechnicianCardProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface p-3 shadow-panel">
      <div className="flex items-start gap-2.5">
        <Avatar name={technician.user.name} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <Link href={`/technicians/${technician.id}`} className="truncate text-sm font-semibold text-ink hover:text-accent-600">
              {technician.user.name}
            </Link>
            <TechnicianActionsMenu technicianId={technician.id} status={technician.status} canUpdate={canUpdate} onStatusChanged={onStatusChanged} onError={onError} />
          </div>
          <p className="num text-xs text-ink-muted">{technician.employeeId ?? '—'}</p>
        </div>
      </div>

      <p className="text-xs text-ink-secondary">{technician.specialisation ?? '—'}</p>

      {technician.skills.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {technician.skills.slice(0, 3).map((skill) => (
            <span key={skill} className="rounded-full bg-surface-hover px-2 py-0.5 text-micro font-medium text-ink-secondary">
              {skill}
            </span>
          ))}
          {technician.skills.length > 3 ? <span className="text-micro text-ink-muted">+{technician.skills.length - 3}</span> : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between text-xs text-ink-secondary">
        <span>{technician.jobsOpen} Active Jobs</span>
        <TechnicianAvailabilityBadge availability={technician.availability} />
      </div>

      <WorkloadBar percent={technician.workloadPercent} />
    </div>
  );
}
