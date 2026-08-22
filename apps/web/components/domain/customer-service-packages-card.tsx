'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { formatDate, formatMoney } from '@/lib/format';
import type { CustomerServicePackage, CustomerVehicle, PaginatedResult, ServicePackage } from '@/lib/api-types';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';

const STATUS_TONE: Record<CustomerServicePackage['status'], 'success' | 'neutral' | 'warning'> = {
  ACTIVE: 'success',
  EXPIRED: 'neutral',
  CANCELLED: 'neutral',
};

interface SellPackageFormProps {
  customerId: string;
  vehicles: CustomerVehicle[];
  onSold: () => void;
}

function SellPackageForm({ customerId, vehicles, onSold }: SellPackageFormProps) {
  const packages = useApiQuery<PaginatedResult<ServicePackage>>(() => apiGet('/service-packages?isActive=true&pageSize=100'), []);
  const [servicePackageId, setServicePackageId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [isSelling, setIsSelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSell() {
    if (!servicePackageId || !vehicleId) return;
    setIsSelling(true);
    setError(null);
    try {
      await apiPost('/customer-service-packages', { servicePackageId, customerId, vehicleId });
      setServicePackageId('');
      setVehicleId('');
      onSold();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sell this package.');
    } finally {
      setIsSelling(false);
    }
  }

  if (!packages.data || packages.data.items.length === 0 || vehicles.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
      <div className="w-56">
        <Select label="Package" value={servicePackageId} onChange={(e) => setServicePackageId(e.target.value)}>
          <option value="">Select a package…</option>
          {packages.data.items.map((pkg) => (
            <option key={pkg.id} value={pkg.id}>
              {pkg.name} — {formatMoney(pkg.price)}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-48">
        <Select label="Vehicle" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
          <option value="">Select a vehicle…</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.registrationNo}
            </option>
          ))}
        </Select>
      </div>
      <Button type="button" size="sm" onClick={handleSell} isLoading={isSelling} disabled={!servicePackageId || !vehicleId}>
        Sell Package
      </Button>
      {error ? <p className="w-full text-xs text-danger-600 dark:text-danger-400">{error}</p> : null}
    </div>
  );
}

interface CustomerServicePackagesCardProps {
  customerId: string;
  vehicles: CustomerVehicle[];
  canSell: boolean;
  canUpdate: boolean;
}

export function CustomerServicePackagesCard({ customerId, vehicles, canSell, canUpdate }: CustomerServicePackagesCardProps) {
  const query = useApiQuery<PaginatedResult<CustomerServicePackage>>(
    () => apiGet(`/customer-service-packages?customerId=${customerId}&pageSize=50`),
    [customerId],
  );
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleRenew(id: string) {
    setActioningId(id);
    setActionError(null);
    try {
      await apiPost(`/customer-service-packages/${id}/renew`);
      query.refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not renew this package.');
    } finally {
      setActioningId(null);
    }
  }

  async function handleCancel(id: string) {
    if (!window.confirm('Cancel this package? This cannot be undone.')) return;
    setActioningId(id);
    setActionError(null);
    try {
      await apiPatch(`/customer-service-packages/${id}/cancel`);
      query.refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not cancel this package.');
    } finally {
      setActioningId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Packages {query.data ? `(${query.data.total})` : ''}</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        {query.error ? <ErrorState message={query.error} onRetry={query.refetch} /> : null}
        {actionError ? <p className="text-xs text-danger-600 dark:text-danger-400">{actionError}</p> : null}

        {query.data && query.data.items.length === 0 ? <p className="text-sm text-ink-muted">No packages sold to this customer yet.</p> : null}

        {query.data && query.data.items.length > 0 ? (
          <ul className="flex flex-col divide-y divide-line">
            {query.data.items.map((pkg) => (
              <li key={pkg.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="text-ink">
                    {pkg.servicePackage.name} <span className="text-ink-muted">— {pkg.vehicle.registrationNo}</span>
                  </span>
                  <span className="text-xs text-ink-muted">
                    {pkg.visitsUsed}/{pkg.visitLimit ?? '∞'} visits used · valid until {formatDate(pkg.endDate)} ·{' '}
                    <Link href={`/invoices/${pkg.purchaseInvoice.id}`} className="hover:text-accent-600 hover:underline">
                      {pkg.purchaseInvoice.invoiceNumber}
                    </Link>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={STATUS_TONE[pkg.status]}>{pkg.status}</Badge>
                  {canSell && pkg.status !== 'ACTIVE' ? (
                    <Button type="button" variant="secondary" size="sm" onClick={() => handleRenew(pkg.id)} isLoading={actioningId === pkg.id}>
                      Renew
                    </Button>
                  ) : null}
                  {canUpdate && pkg.status === 'ACTIVE' ? (
                    <button
                      type="button"
                      onClick={() => handleCancel(pkg.id)}
                      disabled={actioningId === pkg.id}
                      className="text-xs text-danger-600 hover:underline dark:text-danger-400"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {canSell ? <SellPackageForm customerId={customerId} vehicles={vehicles} onSold={query.refetch} /> : null}
      </CardBody>
    </Card>
  );
}
