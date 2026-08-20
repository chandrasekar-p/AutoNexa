import { Badge } from '@/components/ui/badge';
import type { TechnicianStatus } from '@/lib/api-types';

const TONE: Record<TechnicianStatus, 'success' | 'warning' | 'neutral'> = {
  ACTIVE: 'success',
  ON_LEAVE: 'warning',
  INACTIVE: 'neutral',
};
const LABEL: Record<TechnicianStatus, string> = {
  ACTIVE: 'Active',
  ON_LEAVE: 'On Leave',
  INACTIVE: 'Inactive',
};

export function TechnicianStatusBadge({ status }: { status: TechnicianStatus }) {
  return <Badge tone={TONE[status]}>{LABEL[status]}</Badge>;
}
