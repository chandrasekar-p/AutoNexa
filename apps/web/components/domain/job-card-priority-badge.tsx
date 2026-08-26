import { Badge } from '@/components/ui/badge';
import type { JobCardPriority } from '@/lib/api-types';

const TONE: Record<JobCardPriority, 'neutral' | 'warning' | 'danger'> = {
  NORMAL: 'neutral',
  HIGH: 'warning',
  URGENT: 'danger',
};
const LABEL: Record<JobCardPriority, string> = {
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent',
};

/** Subtle by design — NORMAL reads as a quiet neutral chip, not a call to action; only URGENT/HIGH should draw the eye. */
export function JobCardPriorityBadge({ priority }: { priority: JobCardPriority }) {
  return <Badge tone={TONE[priority]}>{LABEL[priority]}</Badge>;
}
