'use client';

import { useState } from 'react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { formatMoney } from '@/lib/format';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardBody } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

interface ReportConfig {
  key: string;
  label: string;
  category: string;
  endpoint: string;
  supportsDateRange: boolean;
  shape: 'table' | 'object';
}

// One representative report per SRS §22 category, not all 13 backend
// endpoints — Purchase Orders/Invoices already have their own full browsing
// UI elsewhere, so their report equivalents (`purchases`, `invoices`) are
// deliberately not duplicated here.
const REPORTS: ReportConfig[] = [
  { key: 'sales', label: 'Sales (Daily)', category: 'Sales', endpoint: '/reports/sales', supportsDateRange: true, shape: 'table' },
  {
    key: 'customer-revenue',
    label: 'Sales by Customer',
    category: 'Sales',
    endpoint: '/reports/customer-revenue',
    supportsDateRange: true,
    shape: 'table',
  },
  {
    key: 'inventory-valuation',
    label: 'Stock Valuation',
    category: 'Inventory',
    endpoint: '/reports/inventory-valuation',
    supportsDateRange: false,
    shape: 'table',
  },
  {
    key: 'parts-sales',
    label: 'Top-Selling Parts',
    category: 'Inventory',
    endpoint: '/reports/parts-sales',
    supportsDateRange: true,
    shape: 'table',
  },
  {
    key: 'supplier-outstanding',
    label: 'Supplier Outstanding',
    category: 'Purchase',
    endpoint: '/reports/supplier-outstanding',
    supportsDateRange: false,
    shape: 'table',
  },
  {
    key: 'job-card-status',
    label: 'Job Card Status',
    category: 'Workshop',
    endpoint: '/reports/job-card-status',
    supportsDateRange: true,
    shape: 'table',
  },
  {
    key: 'technician-performance',
    label: 'Technician Performance',
    category: 'Workshop',
    endpoint: '/reports/technician-performance',
    supportsDateRange: true,
    shape: 'table',
  },
  {
    key: 'outstanding',
    label: 'Customer Outstanding',
    category: 'Finance',
    endpoint: '/reports/outstanding',
    supportsDateRange: false,
    shape: 'table',
  },
  { key: 'payments', label: 'Payments', category: 'Finance', endpoint: '/reports/payments', supportsDateRange: true, shape: 'table' },
  { key: 'gst-summary', label: 'GST Summary', category: 'Finance', endpoint: '/reports/gst-summary', supportsDateRange: true, shape: 'object' },
  {
    key: 'profit-margin',
    label: 'Profit Margin',
    category: 'Finance',
    endpoint: '/reports/profit-margin',
    supportsDateRange: true,
    shape: 'object',
  },
];

const CATEGORIES = [...new Set(REPORTS.map((r) => r.category))];

const MONEY_KEY_PATTERN = /amount|total|price|revenue|margin|outstanding|valuation|gst|subtotal|cost/i;

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function formatCell(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') {
    const named = value as { name?: string };
    return named.name ?? JSON.stringify(value);
  }
  if (MONEY_KEY_PATTERN.test(key) && (typeof value === 'string' || typeof value === 'number') && !Number.isNaN(Number(value))) {
    return formatMoney(value);
  }
  return String(value);
}

function ReportTable({ data }: { data: unknown }) {
  const rows: Record<string, unknown>[] = Array.isArray(data)
    ? data
    : ((data as { items?: Record<string, unknown>[] })?.items ?? []);

  if (rows.length === 0) {
    return <p className="text-sm text-ink-muted">No data for this report yet.</p>;
  }

  const columns = Object.keys(rows[0] ?? {}).filter((k) => k !== 'id');

  return (
    <Table>
      <TableHead>
        <tr>
          {columns.map((col) => (
            <TableHeaderCell key={col}>{formatLabel(col)}</TableHeaderCell>
          ))}
        </tr>
      </TableHead>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={i}>
            {columns.map((col) => (
              <TableCell key={col} className={MONEY_KEY_PATTERN.test(col) ? 'num' : ''}>
                {formatCell(col, row[col])}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ReportObject({ data }: { data: unknown }) {
  const entries = Object.entries(data as Record<string, unknown>).filter(([key]) => key !== 'note');
  const note = (data as { note?: string }).note;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {entries.map(([key, value]) => (
          <div key={key} className="flex flex-col gap-0.5">
            <span className="text-micro font-semibold uppercase tracking-wide text-ink-secondary">{formatLabel(key)}</span>
            <span className="num text-lg font-semibold text-ink">{formatCell(key, value)}</span>
          </div>
        ))}
      </div>
      {note ? <p className="text-xs text-ink-muted">{note}</p> : null}
    </div>
  );
}

export default function ReportsPage() {
  const [reportKey, setReportKey] = useState(REPORTS[0]!.key);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const report = REPORTS.find((r) => r.key === reportKey)!;

  const query = useApiQuery<unknown>(() => {
    const params = new URLSearchParams();
    if (report.supportsDateRange) {
      if (from) params.set('from', from);
      if (to) params.set('to', to);
    }
    const qs = params.toString();
    return apiGet(`${report.endpoint}${qs ? `?${qs}` : ''}`);
  }, [report.endpoint, report.supportsDateRange, from, to]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Reports</h1>
        <p className="text-sm text-ink-secondary">One representative report per category — see each module for full detail.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-64">
          <Select label="Report" value={reportKey} onChange={(e) => setReportKey(e.target.value)}>
            {CATEGORIES.map((category) => (
              <optgroup key={category} label={category}>
                {REPORTS.filter((r) => r.category === category).map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </div>
        {report.supportsDateRange ? (
          <>
            <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </>
        ) : (
          <p className="pb-2 text-xs text-ink-muted">Point-in-time snapshot — no date range for this report.</p>
        )}
      </div>

      <Card>
        <CardBody className="flex flex-col gap-3 pt-5">
          {query.isLoading ? <Skeleton className="h-48 w-full" /> : null}
          {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}
          {query.data ? (report.shape === 'table' ? <ReportTable data={query.data} /> : <ReportObject data={query.data} />) : null}
        </CardBody>
      </Card>
    </div>
  );
}
