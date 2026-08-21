'use client';

import {
  CalendarCheck,
  Car,
  ClipboardList,
  CheckCircle2,
  FileText,
  IndianRupee,
  TrendingUp,
  Wrench,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import type { DashboardSummary, NotificationAlerts } from '@/lib/api-types';
import { formatMoney, formatNumber } from '@/lib/format';
import { KpiCard } from '@/components/domain/kpi-card';
import { TechnicianWorkloadCard } from '@/components/domain/technician-workload-card';
import { DashboardAlertsCard } from '@/components/domain/dashboard-alerts-card';
import { SalesTrendChart } from '@/components/domain/sales-trend-chart';
import { JobCardStatusChart } from '@/components/domain/job-card-status-chart';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

export default function DashboardPage() {
  const summary = useApiQuery<DashboardSummary>(() => apiGet('/dashboard/summary'), []);
  const alerts = useApiQuery<NotificationAlerts>(() => apiGet('/notifications/alerts'), []);
  // The two charts below hit GET /reports/*, which requires report:read —
  // Technician and Receptionist don't have it by default (see
  // default-role-grants.ts), so skip rendering (and fetching) rather than
  // showing them a guaranteed 403. UX-only, same caveat as every other
  // usePermission() call — the backend is what actually enforces this.
  const canViewReports = usePermission('report:read');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
        <p className="text-sm text-ink-secondary">Today&rsquo;s shop-floor snapshot.</p>
      </div>

      {summary.isLoading ? <KpiGridSkeleton /> : null}
      {summary.error ? <ErrorState message={summary.error} onRetry={summary.refetch} /> : null}
      {summary.data ? <KpiGrid data={summary.data} /> : null}

      {canViewReports ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SalesTrendChart />
          <JobCardStatusChart />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TechnicianWorkloadCard
          workload={summary.data?.technicianWorkload ?? null}
          isLoading={summary.isLoading}
          error={summary.error}
          onRetry={summary.refetch}
        />
        <DashboardAlertsCard
          alerts={alerts.data}
          isLoading={alerts.isLoading}
          error={alerts.error}
          onRetry={alerts.refetch}
        />
      </div>
    </div>
  );
}

const ICON_SIZE = 'h-4 w-4';

function KpiGrid({ data }: { data: DashboardSummary }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <KpiCard
        label="Today's Appointments"
        value={formatNumber(data.todaysAppointments)}
        tone="blue"
        icon={<CalendarCheck className={ICON_SIZE} />}
      />
      <KpiCard
        label="Vehicles In Service"
        value={formatNumber(data.vehiclesInService)}
        tone="fuchsia"
        icon={<Car className={ICON_SIZE} />}
      />
      <KpiCard
        label="Open Job Cards"
        value={formatNumber(data.openJobCards)}
        tone="accent"
        icon={<ClipboardList className={ICON_SIZE} />}
      />
      <KpiCard
        label="Completed Today"
        value={formatNumber(data.completedJobsToday)}
        tone="accent"
        icon={<CheckCircle2 className={ICON_SIZE} />}
      />
      <KpiCard
        label="Pending Estimates"
        value={formatNumber(data.pendingEstimates)}
        tone="teal"
        icon={<FileText className={ICON_SIZE} />}
      />
      <KpiCard
        label="Pending Payments"
        value={formatMoney(data.pendingPayments.totalOutstanding)}
        sublabel={`${formatNumber(data.pendingPayments.count)} invoice${data.pendingPayments.count === 1 ? '' : 's'}`}
        tone="warning"
        icon={<IndianRupee className={ICON_SIZE} />}
      />
      <KpiCard
        label="Today's Sales"
        value={formatMoney(data.todaysSales)}
        tone="blue"
        icon={<TrendingUp className={ICON_SIZE} />}
      />
      <KpiCard
        label="Monthly Sales"
        value={formatMoney(data.monthlySales)}
        tone="fuchsia"
        icon={<TrendingUp className={ICON_SIZE} />}
      />
      <KpiCard
        label="Labour Revenue (MTD)"
        value={formatMoney(data.labourRevenueMonthly)}
        tone="accent"
        icon={<Wrench className={ICON_SIZE} />}
      />
      <KpiCard
        label="Parts Revenue (MTD)"
        value={formatMoney(data.partsRevenueMonthly)}
        tone="teal"
        icon={<Package className={ICON_SIZE} />}
      />
      <KpiCard
        label="Low Stock Parts"
        value={formatNumber(data.lowStockCount)}
        tone={data.lowStockCount > 0 ? 'warning' : 'neutral'}
        icon={<AlertTriangle className={ICON_SIZE} />}
      />
    </div>
  );
}

function KpiGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 11 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  );
}
