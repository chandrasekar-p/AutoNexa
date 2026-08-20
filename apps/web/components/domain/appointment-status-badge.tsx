import { Badge } from '@/components/ui/badge';
import type { AppointmentStatus } from '@/lib/api-types';

export const APPOINTMENT_STATUS_TONE: Record<AppointmentStatus, 'neutral' | 'accent' | 'warning' | 'success' | 'danger'> = {
  SCHEDULED: 'neutral',
  CONFIRMED: 'accent',
  VEHICLE_RECEIVED: 'accent',
  IN_SERVICE: 'accent',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  NO_SHOW: 'danger',
};

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Scheduled',
  CONFIRMED: 'Confirmed',
  VEHICLE_RECEIVED: 'Vehicle Received',
  IN_SERVICE: 'In Service',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return <Badge tone={APPOINTMENT_STATUS_TONE[status]}>{APPOINTMENT_STATUS_LABEL[status]}</Badge>;
}
