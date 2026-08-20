'use client';

import { useState } from 'react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { formatDate } from '@/lib/format';
import type { DeliveryChannel, DeliveryLog, DeliveryStatus, PaginatedResult } from '@/lib/api-types';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const PAGE_SIZE = 30;

const STATUS_TONE: Record<DeliveryStatus, 'success' | 'danger' | 'neutral'> = {
  SENT: 'success',
  FAILED: 'danger',
  SKIPPED: 'neutral',
};

export default function DeliveriesPage() {
  const [channel, setChannel] = useState<DeliveryChannel | ''>('');
  const [status, setStatus] = useState<DeliveryStatus | ''>('');
  const [page, setPage] = useState(1);

  const query = useApiQuery<PaginatedResult<DeliveryLog>>(
    () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (channel) params.set('channel', channel);
      if (status) params.set('status', status);
      return apiGet(`/messaging/deliveries?${params.toString()}`);
    },
    [page, channel, status],
  );

  function handleChannelChange(value: string) {
    setChannel(value as DeliveryChannel | '');
    setPage(1);
  }

  function handleStatusChange(value: string) {
    setStatus(value as DeliveryStatus | '');
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Message Deliveries</h1>
        <p className="text-sm text-ink-secondary">
          Every outbound Email, SMS, WhatsApp, and Slack attempt triggered by appointments, estimates, job cards,
          and invoices — newest first.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="w-48">
          <Select value={channel} onChange={(e) => handleChannelChange(e.target.value)} aria-label="Filter by channel">
            <option value="">All channels</option>
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="SLACK">Slack</option>
          </Select>
        </div>
        <div className="w-48">
          <Select value={status} onChange={(e) => handleStatusChange(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
            <option value="SKIPPED">Skipped</option>
          </Select>
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
          No deliveries match those filters.
        </p>
      ) : null}

      {query.data && query.data.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-line bg-surface shadow-card">
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Channel</TableHeaderCell>
                  <TableHeaderCell>Event</TableHeaderCell>
                  <TableHeaderCell>Recipient</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Detail</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {query.data.items.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-ink-secondary">{formatDate(entry.createdAt)}</TableCell>
                    <TableCell className="num">{entry.channel}</TableCell>
                    <TableCell className="text-ink-secondary">{entry.event}</TableCell>
                    <TableCell className="text-ink-secondary">{entry.recipient}</TableCell>
                    <TableCell>
                      <Badge tone={STATUS_TONE[entry.status]}>{entry.status}</Badge>
                    </TableCell>
                    <TableCell className="text-ink-secondary">{entry.errorMessage ?? '—'}</TableCell>
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
