import { Badge } from '@/components/ui/badge';

/** Only Active/Inactive exist on Supplier.isActive — no third "Pending" state in the schema. */
export function SupplierStatusBadge({ isActive }: { isActive: boolean }) {
  return <Badge tone={isActive ? 'success' : 'neutral'}>{isActive ? 'Active' : 'Inactive'}</Badge>;
}
