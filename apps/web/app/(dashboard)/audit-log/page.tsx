'use client';

import { useState } from 'react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { formatDate } from '@/lib/format';
import type { AuditLogEntry, PaginatedResult } from '@/lib/api-types';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const PAGE_SIZE = 30;

function ChangeDetail({ entry }: { entry: AuditLogEntry }) {
  const [isOpen, setIsOpen] = useState(false);
  if (entry.oldValue === null && entry.newValue === null) return null;

  return (
    <div>
      <button type="button" onClick={() => setIsOpen((v) => !v)} className="text-xs text-accent-600 hover:underline">
        {isOpen ? 'Hide details' : 'View details'}
      </button>
      {isOpen ? (
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {entry.oldValue !== null ? (
            <pre className="overflow-x-auto rounded border border-line bg-surface-hover p-2 text-xs text-ink-secondary">
              {JSON.stringify(entry.oldValue, null, 2)}
            </pre>
          ) : null}
          {entry.newValue !== null ? (
            <pre className="overflow-x-auto rounded border border-line bg-surface-hover p-2 text-xs text-ink-secondary">
              {JSON.stringify(entry.newValue, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function AuditLogPage() {
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const debouncedEntity = useDebouncedValue(entity);
  const debouncedAction = useDebouncedValue(action);

  const query = useApiQuery<PaginatedResult<AuditLogEntry>>(
    () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (debouncedEntity) params.set('entity', debouncedEntity);
      if (debouncedAction) params.set('action', debouncedAction);
      return apiGet(`/audit-logs?${params.toString()}`);
    },
    [page, debouncedEntity, debouncedAction],
  );

  function handleEntityChange(value: string) {
    setEntity(value);
    setPage(1);
  }

  function handleActionChange(value: string) {
    setAction(value);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Audit Log</h1>
        <p className="text-sm text-ink-secondary">Every tracked mutation across the workshop, newest first.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="max-w-xs">
          <Input
            value={entity}
            onChange={(e) => handleEntityChange(e.target.value)}
            placeholder="Entity, e.g. Invoice"
            aria-label="Filter by entity"
          />
        </div>
        <div className="max-w-xs">
          <Input
            value={action}
            onChange={(e) => handleActionChange(e.target.value)}
            placeholder="Action, e.g. invoice.create"
            aria-label="Filter by action"
          />
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}

      {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}

      {query.data && query.data.items.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface px-5 py-10 text-center text-sm text-ink-muted">
          No audit events match those filters.
        </p>
      ) : null}

      {query.data && query.data.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-line bg-surface shadow-card">
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>User</TableHeaderCell>
                  <TableHeaderCell>Action</TableHeaderCell>
                  <TableHeaderCell>Entity</TableHeaderCell>
                  <TableHeaderCell>Details</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {query.data.items.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-ink-secondary">{formatDate(entry.createdAt)}</TableCell>
                    <TableCell className="text-ink-secondary">{entry.user?.name ?? '—'}</TableCell>
                    <TableCell className="num">{entry.action}</TableCell>
                    <TableCell className="text-ink-secondary">{entry.entity}</TableCell>
                    <TableCell>
                      <ChangeDetail entry={entry} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={query.data.page}
            totalPages={query.data.totalPages}
            total={query.data.total}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </div>
  );
}
