import { Badge } from '@/components/ui/badge';

/** Only Active/Inactive exist on ServicePackage.isActive — no third state in the schema. */
export function ServicePackageStatusBadge({ isActive }: { isActive: boolean }) {
  return <Badge tone={isActive ? 'success' : 'neutral'}>{isActive ? 'Active' : 'Inactive'}</Badge>;
}
