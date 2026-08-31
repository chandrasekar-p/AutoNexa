import { Badge } from '@/components/ui/badge';
import type { AttendanceStatus } from '@/lib/api-types';

/** Only the 4 real AttendanceStatus values — no "Late" (not in the schema) and no "Not Marked" badge (that's the absence of a record, a KPI/filter bucket, never a value stamped on an actual row). */
export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  HALF_DAY: 'Half Day',
  ON_LEAVE: 'On Leave',
};

const STATUS_TONE: Record<AttendanceStatus, 'success' | 'danger' | 'warning' | 'neutral'> = {
  PRESENT: 'success',
  ABSENT: 'danger',
  HALF_DAY: 'warning',
  ON_LEAVE: 'neutral',
};

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{ATTENDANCE_STATUS_LABEL[status]}</Badge>;
}
