'use client';

import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { DashboardSummary, NotificationAlerts } from '@/lib/api-types';
import { formatMoney, formatNumber } from '@/lib/format';
import { KpiCard } from '@/components/domain/kpi-card';
import { TechnicianWorkloadCard } from '@/components/domain/technician-workload-card';
import { DashboardAlertsCard } from '@/components/domain/dashboard-alerts-card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

export default function DashboardPage() {
  const summary = useApiQuery<DashboardSummary>(() => apiGet('/dashboard/summary'), []);
  const alerts = useApiQuery<NotificationAlerts>(() => apiGet('/notifications/alerts'), []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-graphite-900">Dashboard</h1>
        <p className="text-sm text-graphite-500">Today&rsquo;s shop-floor snapshot.</p>
      </div>

      {summary.isLoading ? <KpiGridSkeleton /> : null}
      {summary.error ? <ErrorState message={summary.error} onRetry={summary.refetch} /> : null}
      {summary.data ? <KpiGrid data={summary.data} /> : null}

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

function KpiGrid({ data }: { data: DashboardSummary }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      <KpiCard label="Today's Appointments" value={formatNumber(data.todaysAppointments)} />
      <KpiCard label="Vehicles In Service" value={formatNumber(data.vehiclesInService)} tone="accent" />
      <KpiCard label="Open Job Cards" value={formatNumber(data.openJobCards)} tone="accent" />
      <KpiCard label="Completed Today" value={formatNumber(data.completedJobsToday)} tone="accent" />
      <KpiCard label="Pending Estimates" value={formatNumber(data.pendingEstimates)} />
      <KpiCard
        label="Pending Payments"
        value={formatMoney(data.pendingPayments.totalOutstanding)}
        sublabel={`${formatNumber(data.pendingPayments.count)} invoice${data.pendingPayments.count === 1 ? '' : 's'}`}
        tone="warning"
      />
      <KpiCard label="Today's Sales" value={formatMoney(data.todaysSales)} tone="accent" />
      <KpiCard label="Monthly Sales" value={formatMoney(data.monthlySales)} tone="accent" />
      <KpiCard label="Labour Revenue (MTD)" value={formatMoney(data.labourRevenueMonthly)} />
      <KpiCard label="Parts Revenue (MTD)" value={formatMoney(data.partsRevenueMonthly)} />
      <KpiCard
        label="Low Stock Parts"
        value={formatNumber(data.lowStockCount)}
        tone={data.lowStockCount > 0 ? 'warning' : 'neutral'}
      />
    </div>
  );
}

function KpiGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 11 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  );
}
