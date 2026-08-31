import { Badge } from '@/components/ui/badge';

/** Only Active/Inactive exist on User.isActive — no third state in the schema. */
export function UserStatusBadge({ isActive }: { isActive: boolean }) {
  return <Badge tone={isActive ? 'success' : 'neutral'}>{isActive ? 'Active' : 'Inactive'}</Badge>;
}
