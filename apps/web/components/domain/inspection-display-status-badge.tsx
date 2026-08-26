import { Badge } from '@/components/ui/badge';
import type { InspectionDisplayStatus } from '@/lib/api-types';

const TONE: Record<InspectionDisplayStatus, 'accent' | 'success' | 'warning' | 'danger'> = {
  IN_PROGRESS: 'accent',
  PENDING_REVIEW: 'warning',
  OVERDUE: 'danger',
  COMPLETED: 'success',
};
export const INSPECTION_DISPLAY_STATUS_LABEL: Record<InspectionDisplayStatus, string> = {
  IN_PROGRESS: 'In Progress',
  PENDING_REVIEW: 'Pending Review',
  OVERDUE: 'Overdue',
  COMPLETED: 'Completed',
};

/** The derived 4-way status (Pending Review/Overdue included) — for the list table and KPI cards. Use InspectionStatusBadge instead where only the raw stored 2-value status applies (the detail page's header, the Overall Result dropdown). */
export function InspectionDisplayStatusBadge({ status }: { status: InspectionDisplayStatus }) {
  return <Badge tone={TONE[status]}>{INSPECTION_DISPLAY_STATUS_LABEL[status]}</Badge>;
}
