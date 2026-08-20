import { Badge } from '@/components/ui/badge';
import type { InspectionStatus } from '@/lib/api-types';

const TONE: Record<InspectionStatus, 'accent' | 'success'> = {
  IN_PROGRESS: 'accent',
  COMPLETED: 'success',
};
const LABEL: Record<InspectionStatus, string> = {
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

export function InspectionStatusBadge({ status }: { status: InspectionStatus }) {
  return <Badge tone={TONE[status]}>{LABEL[status]}</Badge>;
}
