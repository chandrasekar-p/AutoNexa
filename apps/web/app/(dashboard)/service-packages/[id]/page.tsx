'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Users, UserCheck, IndianRupee } from 'lucide-react';
import { apiGet, apiPatch, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import type { CustomerServicePackage, PaginatedResult, ServicePackage } from '@/lib/api-types';
import { ServicePackageStatusBadge } from '@/components/domain/service-package-status-badge';
import { ServicePackageActionsMenu } from '@/components/domain/service-package-actions-menu';
import { KpiCard } from '@/components/domain/kpi-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

const SOLD_STATUS_TONE: Record<CustomerServicePackage['status'], 'success' | 'neutral' | 'warning'> = {
  ACTIVE: 'success',
  EXPIRED: 'neutral',
  CANCELLED: 'neutral',
};

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-micro font-semibold uppercase tracking-wide text-ink-secondary">{label}</span>
      <span className="text-sm text-ink">{value ?? '—'}</span>
    </div>
  );
}

export default function ServicePackageDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const canUpdate = usePermission('service-package:update');
  const canReadSold = usePermission('service-package:read');

  const [actionError, setActionError] = useState<string | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const query = useApiQuery<ServicePackage>(() => apiGet(`/service-packages/${params.id}`), [params.id]);
  const soldTo = useApiQuery<PaginatedResult<CustomerServicePackage>>(
    () =>
      canReadSold
        ? apiGet(`/customer-service-packages?servicePackageId=${params.id}&pageSize=10`)
        : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }),
    [params.id, canReadSold],
  );

  async function handleToggleActive() {
    if (!query.data) return;
    setIsTogglingStatus(true);
    setActionError(null);
    try {
      await apiPatch(`/service-packages/${params.id}`, { isActive: !query.data.isActive });
      query.refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not update this package.');
    } finally {
      setIsTogglingStatus(false);
    }
  }

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (query.error) {
    return <ErrorState message={query.error} onRetry={query.refetch} />;
  }

  const pkg = query.data;
  if (!pkg) return null;

  const includedItems = [
    ...pkg.includedLabourItems.map((r) => ({ id: r.labourItem.id, label: `${r.labourItem.code} — ${r.labourItem.description}` })),
    ...pkg.includedParts.map((r) => ({ id: r.part.id, label: `${r.part.partNumber} — ${r.part.name}` })),
    ...pkg.includedPartCategories.map((r) => ({ id: r.partCategory.id, label: `${r.partCategory.name} (category)` })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-ink">{pkg.name}</h1>
            <ServicePackageStatusBadge isActive={pkg.isActive} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/service-packages" className="self-center text-sm text-ink-secondary hover:text-ink">
            &larr; Back to packages
          </Link>
          {canUpdate ? (
            <Button variant="secondary" onClick={() => router.push(`/service-packages/${pkg.id}/edit`)}>
              Edit
            </Button>
          ) : null}
          {canUpdate ? (
            <Button variant={pkg.isActive ? 'danger' : 'primary'} onClick={handleToggleActive} isLoading={isTogglingStatus}>
              {pkg.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          ) : null}
          <ServicePackageActionsMenu pkg={pkg} onChanged={query.refetch} onError={setActionError} onDeleted={() => router.push('/service-packages')} />
        </div>
      </div>

      {actionError ? <ErrorState message={actionError} /> : null}

      {pkg.stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Sold Count" value={formatNumber(pkg.stats.soldCount)} tone="neutral" icon={<Users className="h-4 w-4" />} />
          <KpiCard label="Active Sold" value={formatNumber(pkg.stats.activeSoldCount)} tone="teal" icon={<UserCheck className="h-4 w-4" />} />
          <KpiCard label="Total Revenue" value={formatMoney(pkg.stats.totalRevenue)} tone="fuchsia" icon={<IndianRupee className="h-4 w-4" />} />
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Package Details</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-4">
          <Field label="Price" value={formatMoney(pkg.price)} />
          <Field label="GST Rate" value={`${pkg.gstRate}%`} />
          <Field label="Validity" value={`${pkg.validityMonths} months`} />
          <Field label="Visit Limit" value={pkg.visitLimit != null ? `${pkg.visitLimit} visits` : 'Unlimited'} />
          <div className="col-span-2">
            <Field label="Description" value={pkg.description} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What&rsquo;s Included</CardTitle>
        </CardHeader>
        <CardBody>
          {includedItems.length === 0 ? (
            <p className="text-sm text-ink-muted">No labour, parts, or part categories included in this package.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {includedItems.map((item) => (
                <Badge key={item.id} tone="neutral">
                  {item.label}
                </Badge>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {canReadSold ? (
        <Card>
          <CardHeader>
            <CardTitle>Sold To {soldTo.data ? `(${soldTo.data.total})` : ''}</CardTitle>
          </CardHeader>
          <CardBody>
            {soldTo.isLoading ? <Skeleton className="h-10 w-full" /> : null}
            {soldTo.error ? <ErrorState message={soldTo.error} onRetry={soldTo.refetch} /> : null}
            {soldTo.data && soldTo.data.items.length === 0 ? (
              <p className="text-sm text-ink-muted">This package hasn&rsquo;t been sold to any customer yet.</p>
            ) : null}
            {soldTo.data && soldTo.data.items.length > 0 ? (
              <ul className="flex flex-col divide-y divide-line">
                {soldTo.data.items.map((sold) => (
                  <li key={sold.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <Link href={`/customers/${sold.customer.id}`} className="font-medium text-ink hover:text-accent-600">
                      {sold.customer.name}
                    </Link>
                    <span className="num text-xs text-ink-secondary">
                      {sold.vehicle.registrationNo} · {sold.vehicle.brand} {sold.vehicle.model}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {formatDate(sold.startDate)} – {formatDate(sold.endDate)}
                    </span>
                    <span className="num text-xs text-ink-secondary">
                      {sold.visitsUsed} / {sold.visitLimit ?? '∞'} visits
                    </span>
                    <Badge tone={SOLD_STATUS_TONE[sold.status]}>{sold.status}</Badge>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
