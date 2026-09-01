'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { formatDate, daysUntil } from '@/lib/format';
import type { Tenant } from '@/lib/api-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const PLAN_LABEL: Record<string, string> = { trial: 'Trial', starter: 'Starter', pro: 'Pro', standard: 'Standard' };
const PLAN_TONE: Record<string, 'neutral' | 'warning' | 'accent'> = { trial: 'warning', starter: 'accent', pro: 'accent', standard: 'neutral' };

function TrialCell({ tenant }: { tenant: Tenant }) {
  if (!tenant.trialEndsAt) return <span className="text-ink-muted">—</span>;
  const days = daysUntil(tenant.trialEndsAt);
  if (days < 0) return <Badge tone="danger">Expired {Math.abs(days)}d ago</Badge>;
  return <Badge tone={days <= 3 ? 'warning' : 'neutral'}>{days}d left</Badge>;
}

export default function WorkshopsPage() {
  const router = useRouter();
  const query = useApiQuery<Tenant[]>(() => apiGet('/tenants'), []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Workshops</h1>
          <p className="text-sm text-ink-secondary">Every workshop tenant provisioned on this platform.</p>
        </div>
        <Button onClick={() => router.push('/admin/workshops/new')}>New Workshop</Button>
      </div>

      {query.isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}

      {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}

      {query.data && query.data.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface px-5 py-10 text-center text-sm text-ink-muted">No workshops yet.</p>
      ) : null}

      {query.data && query.data.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface shadow-card">
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Workshop</TableHeaderCell>
                <TableHeaderCell>Slug</TableHeaderCell>
                <TableHeaderCell>Plan</TableHeaderCell>
                <TableHeaderCell>Trial</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Created</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {query.data.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/workshops/${tenant.id}`} className="hover:text-accent-600">
                      {tenant.name}
                    </Link>
                  </TableCell>
                  <TableCell className="num text-ink-secondary">{tenant.slug}</TableCell>
                  <TableCell>
                    <Badge tone={PLAN_TONE[tenant.planTier] ?? 'neutral'}>{PLAN_LABEL[tenant.planTier] ?? tenant.planTier}</Badge>
                  </TableCell>
                  <TableCell>
                    <TrialCell tenant={tenant} />
                  </TableCell>
                  <TableCell>
                    <Badge tone={tenant.isActive ? 'success' : 'neutral'}>{tenant.isActive ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell className="text-ink-secondary">{formatDate(tenant.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
