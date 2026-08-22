'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, FileText } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { formatMoney } from '@/lib/format';
import { exportRowsAsCsv } from '@/lib/export/csv';
import { exportRowsAsPdf } from '@/lib/export/pdf';
import { computeColumnTotals } from '@/lib/reports/column-totals';
import type { CurrentTenant } from '@/lib/api-types';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  /** When present, renders a "Group By" select and appends `groupBy=` to the query — currently only comeback-rate needs this. */
  groupByOptions?: { value: string; label: string }[];
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
  {
    key: 'loyalty-liability',
    label: 'Loyalty Liability',
    category: 'Finance',
    endpoint: '/reports/loyalty-liability',
    supportsDateRange: false,
    shape: 'object',
  },
  {
    key: 'packages-summary',
    label: 'Service Packages Summary',
    category: 'Workshop',
    endpoint: '/reports/packages-summary',
    supportsDateRange: false,
    shape: 'table',
  },
  {
    key: 'warranty-liability',
    label: 'Warranty Liability',
    category: 'Finance',
    endpoint: '/reports/warranty-liability',
    supportsDateRange: false,
    shape: 'object',
  },
  {
    key: 'warranty-claims-summary',
    label: 'Warranty Claims Summary',
    category: 'Workshop',
    endpoint: '/reports/warranty-claims-summary',
    supportsDateRange: false,
    shape: 'table',
  },
  {
    key: 'comeback-rate',
    label: 'Comeback Rate',
    category: 'Workshop',
    endpoint: '/reports/comeback-rate',
    supportsDateRange: false,
    shape: 'table',
    groupByOptions: [
      { value: 'technician', label: 'Technician' },
      { value: 'part', label: 'Part' },
      { value: 'supplier', label: 'Supplier' },
    ],
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

/**
 * Server-computed when present (see apps/api's reports.service.ts
 * paginate()/payments() — summed over the FULL dataset, not just the
 * current page). Falls back to summing whatever rows are actually in the
 * response, which is only accurate for a report that isn't paginated —
 * currently just job-card-status, which must keep its bare-array shape
 * for the dashboard's donut chart and so carries no columnTotals of its
 * own.
 */
function getColumnTotals(data: unknown): Record<string, number> {
  const serverTotals = (data as { columnTotals?: Record<string, number> })?.columnTotals;
  if (serverTotals) return serverTotals;
  const rows: Record<string, unknown>[] = Array.isArray(data)
    ? data
    : ((data as { items?: Record<string, unknown>[] })?.items ?? []);
  return computeColumnTotals(rows);
}

/**
 * Normalizes any report's response — paginated `{items}`, a plain array,
 * or a flat summary object — into a uniform columns+rows shape. Shared by
 * the on-screen table/summary render AND the CSV/PDF export, so what you
 * export always matches exactly what you're looking at, Grand Total row
 * included.
 */
function toExportShape(report: ReportConfig, data: unknown): { columns: { key: string; label: string }[]; rows: Record<string, unknown>[] } {
  if (report.shape === 'object') {
    const entries = Object.entries(data as Record<string, unknown>).filter(([key]) => key !== 'note');
    return {
      columns: [
        { key: 'field', label: 'Field' },
        { key: 'value', label: 'Value' },
      ],
      rows: entries.map(([key, value]) => ({ field: formatLabel(key), value: formatCell(key, value) })),
    };
  }

  const rawRows: Record<string, unknown>[] = Array.isArray(data) ? data : ((data as { items?: Record<string, unknown>[] })?.items ?? []);
  const keys = Object.keys(rawRows[0] ?? {}).filter((k) => k !== 'id');
  const rows = rawRows.map((row) => Object.fromEntries(keys.map((key) => [key, formatCell(key, row[key])])));

  const columnTotals = getColumnTotals(data);
  if (Object.keys(columnTotals).length > 0) {
    const labelKey = keys.find((k) => !(k in columnTotals)) ?? keys[0]!;
    rows.push(
      Object.fromEntries(
        keys.map((key) => [key, key in columnTotals ? formatCell(key, columnTotals[key]) : key === labelKey ? 'Grand Total' : '']),
      ),
    );
  }

  return { columns: keys.map((key) => ({ key, label: formatLabel(key) })), rows };
}

function ReportTable({ data }: { data: unknown }) {
  const rows: Record<string, unknown>[] = Array.isArray(data)
    ? data
    : ((data as { items?: Record<string, unknown>[] })?.items ?? []);

  if (rows.length === 0) {
    return <p className="text-sm text-ink-muted">No data for this report yet.</p>;
  }

  const columns = Object.keys(rows[0] ?? {}).filter((k) => k !== 'id');
  const columnTotals = getColumnTotals(data);
  const hasTotals = Object.keys(columnTotals).length > 0;
  const labelCol = columns.find((c) => !(c in columnTotals)) ?? columns[0];

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
        {hasTotals ? (
          <TableRow className="border-t-2 border-line font-semibold text-ink">
            {columns.map((col) => (
              <TableCell key={col} className={col in columnTotals ? 'num' : ''}>
                {col in columnTotals ? formatCell(col, columnTotals[col]) : col === labelCol ? 'Grand Total' : ''}
              </TableCell>
            ))}
          </TableRow>
        ) : null}
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
  const [groupBy, setGroupBy] = useState('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const report = REPORTS.find((r) => r.key === reportKey)!;
  const effectiveGroupBy = groupBy || report.groupByOptions?.[0]?.value || '';

  function handleReportChange(key: string) {
    setReportKey(key);
    setGroupBy('');
  }

  const query = useApiQuery<unknown>(() => {
    const params = new URLSearchParams();
    if (report.supportsDateRange) {
      if (from) params.set('from', from);
      if (to) params.set('to', to);
    }
    if (report.groupByOptions) params.set('groupBy', effectiveGroupBy);
    const qs = params.toString();
    return apiGet(`${report.endpoint}${qs ? `?${qs}` : ''}`);
  }, [report.endpoint, report.supportsDateRange, from, to, report.groupByOptions, effectiveGroupBy]);

  // Best-effort — GET /tenants/me requires tenant:read (Workshop Owner by
  // default, see WorkshopSettingsCard's same gate); exports still work
  // without it, just without a workshop name/logo on the PDF.
  const canReadTenant = usePermission('tenant:read');
  const canExportGst = usePermission('gst-export:read');
  const tenant = useApiQuery<CurrentTenant>(
    () => (canReadTenant ? apiGet('/tenants/me') : Promise.reject(new Error('n/a'))),
    [canReadTenant],
  );

  function handleExportCsv() {
    if (!query.data) return;
    const { columns, rows } = toExportShape(report, query.data);
    exportRowsAsCsv(columns, rows, `${report.key}-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  async function handleExportPdf() {
    if (!query.data) return;
    const { columns, rows } = toExportShape(report, query.data);
    setIsExportingPdf(true);
    try {
      await exportRowsAsPdf({
        title: report.label,
        workshopName: tenant.data?.name ?? null,
        logoUrl: tenant.data?.settings.logoUrl ?? null,
        columns,
        rows,
        filename: `${report.key}-${new Date().toISOString().slice(0, 10)}.pdf`,
      });
    } finally {
      setIsExportingPdf(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Reports</h1>
          <p className="text-sm text-ink-secondary">One representative report per category — see each module for full detail.</p>
        </div>
        {canExportGst ? (
          <Link href="/reports/export" className="text-sm font-medium text-accent-600 hover:underline">
            GST / Tally Export →
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-64">
            <Select label="Report" value={reportKey} onChange={(e) => handleReportChange(e.target.value)}>
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
          {report.groupByOptions ? (
            <div className="w-44">
              <Select label="Group By" value={effectiveGroupBy} onChange={(e) => setGroupBy(e.target.value)}>
                {report.groupByOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          {report.supportsDateRange ? (
            <>
              <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
              <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </>
          ) : (
            <p className="pb-2 text-xs text-ink-muted">Point-in-time snapshot — no date range for this report.</p>
          )}
        </div>

        {query.data ? (
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={handleExportCsv}>
              <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              CSV
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={handleExportPdf} isLoading={isExportingPdf}>
              <FileText className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              PDF
            </Button>
          </div>
        ) : null}
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
