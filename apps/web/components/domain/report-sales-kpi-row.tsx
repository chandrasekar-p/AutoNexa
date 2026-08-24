import { Car, FileText, IndianRupee, TrendingUp, Wallet } from 'lucide-react';
import { KpiCard } from '@/components/domain/kpi-card';
import { formatMoney, formatNumber } from '@/lib/format';
import { formatPeriodLabel, pctChange } from '@/lib/reports/sales-insights';
import type { SalesSummary } from '@/lib/api-types';

const ICON_SIZE = 'h-4 w-4';

function deltaSublabel(pct: number | null): { sublabel?: string; sublabelTone: 'success' | 'danger' | 'muted' } {
  if (pct === null) return { sublabelTone: 'muted' };
  return { sublabel: `${pct >= 0 ? '↑' : '↓'} ${Math.abs(pct).toFixed(1)}% vs previous period`, sublabelTone: pct >= 0 ? 'success' : 'danger' };
}

/** The 5 Sales KPI cards from the reference design — Total Sales, Total Invoices, Cars Serviced, Average Invoice Value, Highest Sales Day — all reusing the dashboard's existing KpiCard component. */
export function ReportSalesKpiRow({ summary }: { summary: SalesSummary }) {
  const totalSales = deltaSublabel(pctChange(Number(summary.kpis.totalSales), Number(summary.previousKpis.totalSales)));
  const totalInvoices = deltaSublabel(pctChange(summary.kpis.totalInvoices, summary.previousKpis.totalInvoices));
  const carsServiced = deltaSublabel(pctChange(summary.kpis.carsServiced, summary.previousKpis.carsServiced));
  const averageInvoice = deltaSublabel(pctChange(Number(summary.kpis.averageInvoiceValue), Number(summary.previousKpis.averageInvoiceValue)));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <KpiCard label="Total Sales" value={formatMoney(summary.kpis.totalSales)} tone="accent" icon={<IndianRupee className={ICON_SIZE} />} {...totalSales} />
      <KpiCard label="Total Invoices" value={formatNumber(summary.kpis.totalInvoices)} tone="blue" icon={<FileText className={ICON_SIZE} />} {...totalInvoices} />
      <KpiCard label="Cars Serviced" value={formatNumber(summary.kpis.carsServiced)} tone="fuchsia" icon={<Car className={ICON_SIZE} />} {...carsServiced} />
      <KpiCard label="Average Invoice Value" value={formatMoney(summary.kpis.averageInvoiceValue)} tone="teal" icon={<Wallet className={ICON_SIZE} />} {...averageInvoice} />
      <KpiCard
        label="Highest Sales Day"
        value={summary.kpis.highestDay ? formatMoney(summary.kpis.highestDay.total) : '—'}
        sublabel={summary.kpis.highestDay ? formatPeriodLabel(summary.kpis.highestDay.period) : undefined}
        sublabelTone="muted"
        tone="warning"
        icon={<TrendingUp className={ICON_SIZE} />}
      />
    </div>
  );
}

