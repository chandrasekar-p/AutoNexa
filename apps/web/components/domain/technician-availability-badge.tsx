import { Badge } from '@/components/ui/badge';
import type { TechnicianAvailability } from '@/lib/api-types';

// No purple tone exists in the shared Badge palette — the spec's own
// "ON LEAVE → purple/neutral" explicitly allows the neutral fallback
// rather than adding a one-off tone to a component used everywhere else.
const TONE: Record<TechnicianAvailability, 'success' | 'warning' | 'neutral'> = {
  AVAILABLE: 'success',
  ON_JOB: 'warning',
  ON_LEAVE: 'neutral',
  INACTIVE: 'neutral',
};
const LABEL: Record<TechnicianAvailability, string> = {
  AVAILABLE: 'Active',
  ON_JOB: 'Busy',
  ON_LEAVE: 'On Leave',
  INACTIVE: 'Inactive',
};

/** The derived 4-state badge (Available/On Job split out of ACTIVE) — for the list table and board cards. Use TechnicianStatusBadge instead where only the raw stored 3-value status applies (the Edit form's actual status control). */
export function TechnicianAvailabilityBadge({ availability }: { availability: TechnicianAvailability }) {
  return <Badge tone={TONE[availability]}>{LABEL[availability]}</Badge>;
}
