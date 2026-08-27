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
import { DATE_RANGE_PRESETS, resolveDateRangePreset, type DateRangePresetKey } from '@/lib/reports/date-range-presets';
import { generateSalesInsights, formatPeriodLabel } from '@/lib/reports/sales-insights';
import type { CurrentTenant, SalesSummary } from '@/lib/api-types';
import { ReportSalesKpiRow } from '@/components/domain/report-sales-kpi-row';
import { ReportSalesChart } from '@/components/domain/report-sales-chart';
import { ReportCategoriesCard } from '@/components/domain/report-categories-card';
import { ReportInsightsCard } from '@/components/domain/report-insights-card';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';
import { cn } from '@/lib/cn';

interface ReportConfig {
  key: string;
  label: string;
  category: string;
  endpoint: string;
  supportsDateRange: boolean;
  shape: 'table' | 'object';
  /** When present, renders a "Group By" select and appends `groupBy=` to the query — currently only comeback-rate needs this. */
  groupByOptions?: { value: string; label: string }[];
  /**
   * When present, the page fetches this instead of `endpoint` and renders
   * the full KPI-cards + chart + insights workspace from its response
   * (see sales-summary.ts). This is the extension point for giving a
   * future report its own bespoke analytics without forking the page —
   * only `sales` uses it today; every other report keeps the plain table.
   */
  summaryEndpoint?: string;
}

// One representative report per SRS §22 category, not all 13 backend
// endpoints — Purchase Orders/Invoices already have their own full browsing
// UI elsewhere, so their report equivalents (`purchases`, `invoices`) are
// deliberately not duplicated here.
const REPORTS: ReportConfig[] = [
  { key: 'sales', label: 'Sales (Daily)', category: 'Sales', endpoint: '/reports/sales', supportsDateRange: true, shape: 'table', summaryEndpoint: '/reports/sales-summary' },
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
const CATEGORY_GROUPS = CATEGORIES.map((category) => ({
  category,
  reports: REPORTS.filter((r) => r.category === category).map((r) => ({ key: r.key, label: r.label })),
}));

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

/** Sales-only: reshapes GET /reports/sales-summary into the same columns+rows export shape as every other report, so CSV/PDF export works identically regardless of which endpoint fed the page. */
function salesSummaryExportShape(summary: SalesSummary): { columns: { key: string; label: string }[]; rows: Record<string, unknown>[] } {
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'invoices', label: 'Invoices' },
    { key: 'carsServiced', label: 'Cars Serviced' },
    { key: 'totalSales', label: 'Total Sales' },
    { key: 'averageInvoice', label: 'Average Invoice' },
  ];
  const rows = summary.buckets.map((b) => ({
    date: formatPeriodLabel(b.period),
    invoices: b.invoiceCount,
    carsServiced: b.carsServiced,
    totalSales: formatMoney(b.total),
    averageInvoice: formatMoney(b.averageInvoice),
  }));
  rows.push({
    date: 'Grand Total',
    invoices: summary.kpis.totalInvoices,
    carsServiced: summary.kpis.carsServiced,
    totalSales: formatMoney(summary.kpis.totalSales),
    averageInvoice: formatMoney(summary.kpis.averageInvoiceValue),
  });
  return { columns, rows };
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

function SalesSummaryTable({ summary }: { summary: SalesSummary }) {
  if (summary.buckets.length === 0) {
    return <p className="text-sm text-ink-muted">No data for this report yet.</p>;
  }

  return (
    <Table>
      <TableHead>
        <tr>
          <TableHeaderCell>Date</TableHeaderCell>
          <TableHeaderCell>Invoices</TableHeaderCell>
          <TableHeaderCell>Cars Serviced</TableHeaderCell>
          <TableHeaderCell>Total Sales</TableHeaderCell>
          <TableHeaderCell>Average Invoice</TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {summary.buckets.map((b) => (
          <TableRow key={b.period}>
            <TableCell>{formatPeriodLabel(b.period)}</TableCell>
            <TableCell className="num">{b.invoiceCount}</TableCell>
            <TableCell className="num">{b.carsServiced}</TableCell>
            <TableCell className="num">{formatMoney(b.total)}</TableCell>
            <TableCell className="num">{formatMoney(b.averageInvoice)}</TableCell>
          </TableRow>
        ))}
        <TableRow className="border-t-2 border-line font-semibold text-ink">
          <TableCell>Grand Total</TableCell>
          <TableCell className="num">{summary.kpis.totalInvoices}</TableCell>
          <TableCell className="num">{summary.kpis.carsServiced}</TableCell>
          <TableCell className="num">{formatMoney(summary.kpis.totalSales)}</TableCell>
          <TableCell className="num">{formatMoney(summary.kpis.averageInvoiceValue)}</TableCell>
        </TableRow>
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

const DEFAULT_RANGE = resolveDateRangePreset('last30')!;

export default function ReportsPage() {
  const [reportKey, setReportKey] = useState(REPORTS[0]!.key);
  const [groupBy, setGroupBy] = useState('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Staged filter state — From/To only take effect once "Apply Filters" is
  // clicked (a preset button applies immediately, same as clicking a
  // Report Category). Today's page re-fetched on every keystroke; this is
  // the one real behavior change the redesign asks for.
  const [draftFrom, setDraftFrom] = useState(DEFAULT_RANGE.from);
  const [draftTo, setDraftTo] = useState(DEFAULT_RANGE.to);
  const [appliedFrom, setAppliedFrom] = useState(DEFAULT_RANGE.from);
  const [appliedTo, setAppliedTo] = useState(DEFAULT_RANGE.to);
  const [activePreset, setActivePreset] = useState<DateRangePresetKey>('last30');
  const [dateError, setDateError] = useState<string | null>(null);

  const report = REPORTS.find((r) => r.key === reportKey)!;
  const effectiveGroupBy = groupBy || report.groupByOptions?.[0]?.value || '';

  function handleReportChange(key: string) {
    setReportKey(key);
    setGroupBy('');
  }

  function handlePresetClick(key: DateRangePresetKey) {
    setActivePreset(key);
    if (key === 'custom') return;
    const range = resolveDateRangePreset(key)!;
    setDraftFrom(range.from);
    setDraftTo(range.to);
    setAppliedFrom(range.from);
    setAppliedTo(range.to);
    setDateError(null);
  }

  function handleApplyFilters() {
    if (draftFrom && draftTo && draftFrom > draftTo) {
      setDateError('"From" must be on or before "To".');
      return;
    }
    setDateError(null);
    setActivePreset('custom');
    setAppliedFrom(draftFrom);
    setAppliedTo(draftTo);
  }

  function handleResetFilters() {
    setDraftFrom(DEFAULT_RANGE.from);
    setDraftTo(DEFAULT_RANGE.to);
    setAppliedFrom(DEFAULT_RANGE.from);
    setAppliedTo(DEFAULT_RANGE.to);
    setActivePreset('last30');
    setDateError(null);
  }

  const query = useApiQuery<unknown>(() => {
    if (report.summaryEndpoint) return Promise.resolve(null); // fetched separately below
    const params = new URLSearchParams();
    if (report.supportsDateRange) {
      if (appliedFrom) params.set('from', appliedFrom);
      if (appliedTo) params.set('to', appliedTo);
    }
    if (report.groupByOptions) params.set('groupBy', effectiveGroupBy);
    const qs = params.toString();
    return apiGet(`${report.endpoint}${qs ? `?${qs}` : ''}`);
  }, [report.endpoint, report.supportsDateRange, report.summaryEndpoint, appliedFrom, appliedTo, report.groupByOptions, effectiveGroupBy]);

  const summaryQuery = useApiQuery<SalesSummary>(() => {
    if (!report.summaryEndpoint) return Promise.reject(new Error('n/a'));
    const params = new URLSearchParams({ groupBy: 'day' });
    if (appliedFrom) params.set('from', appliedFrom);
    if (appliedTo) params.set('to', appliedTo);
    return apiGet(`${report.summaryEndpoint}?${params.toString()}`);
  }, [report.summaryEndpoint, appliedFrom, appliedTo]);

  const insights = summaryQuery.data ? generateSalesInsights(summaryQuery.data) : [];

  // Best-effort — GET /tenants/me requires tenant:read (Workshop Owner by
  // default, see WorkshopSettingsCard's same gate); exports still work
  // without it, just without a workshop name/logo on the PDF.
  const canReadTenant = usePermission('tenant:read');
  const canExportGst = usePermission('gst-export:read');
  const tenant = useApiQuery<CurrentTenant>(
    () => (canReadTenant ? apiGet('/tenants/me') : Promise.reject(new Error('n/a'))),
    [canReadTenant],
  );

  const exportData = report.summaryEndpoint ? summaryQuery.data : query.data;
  const canExport = report.summaryEndpoint ? !!summaryQuery.data : !!query.data;

  function handleExportCsv() {
    if (!exportData) return;
    const { columns, rows } = report.summaryEndpoint ? salesSummaryExportShape(exportData as SalesSummary) : toExportShape(report, exportData);
    exportRowsAsCsv(columns, rows, `${report.key}-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  async function handleExportPdf() {
    if (!exportData) return;
    const { columns, rows } = report.summaryEndpoint ? salesSummaryExportShape(exportData as SalesSummary) : toExportShape(report, exportData);
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

  const isLoading = report.summaryEndpoint ? summaryQuery.isLoading : query.isLoading;
  const error = report.summaryEndpoint ? summaryQuery.error : query.error;
  const refetch = report.summaryEndpoint ? summaryQuery.refetch : query.refetch;
  const isEmpty =
    !isLoading &&
    !error &&
    (report.summaryEndpoint ? summaryQuery.data?.buckets.length === 0 : isEmptyReportData(query.data));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Reports</h1>
          <p className="text-sm text-ink-secondary">Get insights and analyze your workshop performance.</p>
        </div>
        {canExportGst ? (
          <Link href="/reports/export" className="text-sm font-medium text-accent-600 hover:underline">
            GST / Tally Export →
          </Link>
        ) : null}
      </div>

      <Card>
        <CardBody className="flex flex-col gap-4 pt-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-64">
              <Select label="Report Category" value={reportKey} onChange={(e) => handleReportChange(e.target.value)}>
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
                <Input label="From" type="date" value={draftFrom} onChange={(e) => setDraftFrom(e.target.value)} className="w-40" />
                <Input label="To" type="date" value={draftTo} onChange={(e) => setDraftTo(e.target.value)} className="w-40" />
                <Button type="button" size="sm" onClick={handleApplyFilters}>
                  Apply Filters
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={handleResetFilters}>
                  Reset
                </Button>
              </>
            ) : (
              <p className="pb-2 text-xs text-ink-muted">Point-in-time snapshot — no date range for this report.</p>
            )}
          </div>

          {report.supportsDateRange ? (
            <div className="flex flex-wrap gap-2">
              {DATE_RANGE_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => handlePresetClick(preset.key)}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                    preset.key === activePreset
                      ? 'border-accent-400 bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-400'
                      : 'border-line text-ink-secondary hover:bg-surface-hover',
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          ) : null}

          {dateError ? <p className="text-xs text-danger-600 dark:text-danger-400">{dateError}</p> : null}
        </CardBody>
      </Card>

      {canExport ? (
        <div className="flex justify-end gap-2">
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

      {summaryQuery.data && !isLoading && !error ? <ReportSalesKpiRow summary={summaryQuery.data} /> : null}

      {/*
        Two independent stacked columns, not two side-by-side grid rows —
        the Report Categories list (18 reports across 6 categories) is
        naturally much taller than a single chart card, so pairing "chart
        row" with "categories row" separately left a large dead-space gap
        wherever the shorter card sat in a row forced tall by its row-mate.
        Stacking each side's own cards in a flex column means the two
        columns are only ever as mismatched as their own combined content,
        not per-row.

        The right column (Insights + Report Categories) stays mounted
        across loading/error/empty/data states — it's the page's primary
        navigation, and hiding it whenever the current report has no rows
        for the selected filters (a normal, frequent state, not a failure)
        used to strand the user on a dead-end card with only the small
        top dropdown left to escape it.
      */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {isLoading ? (
            <ReportsLoadingSkeleton showSummary={!!report.summaryEndpoint} />
          ) : error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : isEmpty ? (
            <Card>
              <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
                <p className="text-sm font-medium text-ink">No {report.label.toLowerCase()} data found</p>
                <p className="text-xs text-ink-muted">
                  {report.supportsDateRange ? 'There are no records for the selected date range.' : 'There are no records for this report yet.'}
                </p>
                {report.supportsDateRange ? (
                  <Button type="button" variant="secondary" size="sm" onClick={handleResetFilters}>
                    Change Date Range
                  </Button>
                ) : null}
              </CardBody>
            </Card>
          ) : summaryQuery.data ? (
            <>
              <ReportSalesChart buckets={summaryQuery.data.buckets} />
              <Card>
                <CardBody className="pt-5">
                  <SalesSummaryTable summary={summaryQuery.data} />
                </CardBody>
              </Card>
            </>
          ) : (
            <Card>
              <CardBody className="pt-5">{report.shape === 'table' ? <ReportTable data={query.data} /> : <ReportObject data={query.data} />}</CardBody>
            </Card>
          )}
        </div>
        <div className="flex flex-col gap-4">
          {/* Insights first — it's short and belongs near the chart/table it explains. Report Categories (18 reports across 6 categories) is the tallest card on the page by a wide margin, so it goes last and is simply allowed to run past the left column's bottom rather than dragging Insights down with it. */}
          {summaryQuery.data && !isLoading && !error && !isEmpty ? <ReportInsightsCard insights={insights} /> : null}
          <ReportCategoriesCard groups={CATEGORY_GROUPS} activeKey={reportKey} onSelect={handleReportChange} />
        </div>
      </div>
    </div>
  );
}

function isEmptyReportData(data: unknown): boolean {
  if (data === null || data === undefined) return false;
  if (Array.isArray(data)) return data.length === 0;
  const items = (data as { items?: unknown[] }).items;
  return Array.isArray(items) ? items.length === 0 : false;
}

function ReportsLoadingSkeleton({ showSummary }: { showSummary: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {showSummary ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : null}
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
