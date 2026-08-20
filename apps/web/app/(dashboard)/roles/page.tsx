'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import type { Role } from '@/lib/api-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

export default function RolesPage() {
  const router = useRouter();
  const canCreate = usePermission('role:create');

  const query = useApiQuery<Role[]>(() => apiGet('/roles'), []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Roles</h1>
          <p className="text-sm text-ink-secondary">Configurable role-based permissions for this workshop.</p>
        </div>
        {canCreate ? <Button onClick={() => router.push('/roles/new')}>New Role</Button> : null}
      </div>

      {query.isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}

      {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}

      {query.data && query.data.length > 0 ? (
        <div className="rounded-lg border border-line bg-surface shadow-card">
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Permissions</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {query.data.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">
                    <Link href={`/roles/${role.id}`} className="hover:text-accent-600">
                      {role.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge tone={role.isSystem ? 'neutral' : 'accent'}>{role.isSystem ? 'System' : 'Custom'}</Badge>
                  </TableCell>
                  <TableCell className="num text-ink-secondary">{role.permissions.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
