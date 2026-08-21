'use client';

import {
  CalendarCheck,
  CalendarDays,
  Car,
  ClipboardList,
  IndianRupee,
  Users,
} from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { useAuth } from '@/lib/auth';
import type { DashboardSummary, NotificationAlerts } from '@/lib/api-types';
import { formatFullDate, formatMoney, formatNumber } from '@/lib/format';
import { KpiCard } from '@/components/domain/kpi-card';
import { TechnicianWorkloadCard } from '@/components/domain/technician-workload-card';
import { DashboardAlertsCard } from '@/components/domain/dashboard-alerts-card';
import { TodaysWorkshopCard } from '@/components/domain/todays-workshop-card';
import { QuickActionsCard } from '@/components/domain/quick-actions-card';
import { NeedsAttentionCard } from '@/components/domain/needs-attention-card';
import { LowStockPartsCard } from '@/components/domain/low-stock-parts-card';
import { SalesTrendChart } from '@/components/domain/sales-trend-chart';
import { JobCardStatusChart } from '@/components/domain/job-card-status-chart';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { user } = useAuth();
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
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink sm:text-[28px]">
            {greeting()}, {user?.name ?? user?.email ?? 'there'} <span aria-hidden>👋</span>
          </h1>
          <p className="text-sm text-ink-secondary">Here&rsquo;s what&rsquo;s happening in your workshop today.</p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-sm text-ink-secondary">
          <CalendarDays className="h-4 w-4" aria-hidden />
          {formatFullDate(new Date())}
        </span>
      </div>

      {summary.isLoading ? <KpiGridSkeleton /> : null}
      {summary.error ? <ErrorState message={summary.error} onRetry={summary.refetch} /> : null}
      {summary.data ? <KpiGrid data={summary.data} /> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TodaysWorkshopCard
            jobCards={summary.data?.todaysWorkshop ?? null}
            isLoading={summary.isLoading}
            error={summary.error}
            onRetry={summary.refetch}
          />
        </div>
        <QuickActionsCard />
      </div>

      {canViewReports ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <SalesTrendChart
            monthlySales={summary.data?.monthlySales}
            labourRevenueMonthly={summary.data?.labourRevenueMonthly}
            partsRevenueMonthly={summary.data?.partsRevenueMonthly}
          />
          <JobCardStatusChart />
          <div className="flex flex-col gap-6">
            <NeedsAttentionCard
              summary={summary.data ?? null}
              lowStockParts={alerts.data?.lowStockParts ?? null}
              isLoading={summary.isLoading || alerts.isLoading}
            />
            <LowStockPartsCard parts={alerts.data?.lowStockParts ?? null} isLoading={alerts.isLoading} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <NeedsAttentionCard
            summary={summary.data ?? null}
            lowStockParts={alerts.data?.lowStockParts ?? null}
            isLoading={summary.isLoading || alerts.isLoading}
          />
          <LowStockPartsCard parts={alerts.data?.lowStockParts ?? null} isLoading={alerts.isLoading} />
        </div>
      )}

      <div id="dashboard-alerts" className="grid grid-cols-1 gap-6 scroll-mt-16 lg:grid-cols-2">
        <TechnicianWorkloadCard
          workload={summary.data?.technicianWorkload ?? null}
          scope={summary.data?.technicianWorkloadScope ?? null}
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
  const salesChangeLabel =
    data.salesChangeVsYesterdayPct != null
      ? `${data.salesChangeVsYesterdayPct >= 0 ? '+' : ''}${data.salesChangeVsYesterdayPct}% vs yesterday`
      : undefined;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <KpiCard
        label="Total Customers"
        value={formatNumber(data.totalCustomers)}
        sublabel={data.newCustomersThisWeek > 0 ? `+${formatNumber(data.newCustomersThisWeek)} this week` : undefined}
        sublabelTone="success"
        tone="blue"
        icon={<Users className={ICON_SIZE} />}
        href="/customers"
      />
      <KpiCard
        label="Today's Appointments"
        value={formatNumber(data.todaysAppointments)}
        sublabel="View Today's Schedule"
        tone="fuchsia"
        icon={<CalendarCheck className={ICON_SIZE} />}
        href="/appointments"
      />
      <KpiCard
        label="Vehicles in Workshop"
        value={formatNumber(data.vehiclesInService)}
        sublabel="View In-Bay Vehicles"
        tone="teal"
        icon={<Car className={ICON_SIZE} />}
        href="/job-cards"
      />
      <KpiCard
        label="Open Job Cards"
        value={formatNumber(data.openJobCards)}
        sublabel="View All Jobs"
        tone="warning"
        icon={<ClipboardList className={ICON_SIZE} />}
        href="/job-cards"
      />
      {data.todaysSales !== undefined ? (
        <KpiCard
          label="Today's Sales"
          value={formatMoney(data.todaysSales)}
          sublabel={salesChangeLabel}
          sublabelTone={data.salesChangeVsYesterdayPct != null && data.salesChangeVsYesterdayPct < 0 ? 'danger' : 'success'}
          tone="accent"
          icon={<IndianRupee className={ICON_SIZE} />}
          href="/invoices"
        />
      ) : (
        <KpiCard
          label="Completed Today"
          value={formatNumber(data.completedJobsToday)}
          tone="accent"
          icon={<ClipboardList className={ICON_SIZE} />}
          href="/job-cards"
        />
      )}
    </div>
  );
}

function KpiGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  );
}
