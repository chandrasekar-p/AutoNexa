'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet, apiPatch, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { formatDate, formatMoney } from '@/lib/format';
import type { EstimateDetail, VehicleDetail } from '@/lib/api-types';
import { EstimateStatusBadge } from '@/components/domain/estimate-status-badge';
import { EstimateLineItems } from '@/components/domain/estimate-line-items';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

function SummaryRow({ label, value, emphasized }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={emphasized ? 'text-sm font-medium text-ink' : 'text-sm text-ink-secondary'}>{label}</span>
      <span className={emphasized ? 'num text-base font-semibold text-ink' : 'num text-sm text-ink'}>{value}</span>
    </div>
  );
}

export default function EstimateDetailPage() {
  const params = useParams<{ id: string }>();
  const canUpdate = usePermission('estimate:update');

  const [isActing, setIsActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [convertedJobCard, setConvertedJobCard] = useState<{ id: string; jobCardNumber: string } | null>(null);

  const [jobDescription, setJobDescription] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState<string | null>(null);

  const query = useApiQuery<EstimateDetail>(() => apiGet(`/estimates/${params.id}`), [params.id]);
  const vehicle = useApiQuery<VehicleDetail>(
    () => (query.data ? apiGet(`/vehicles/${query.data.vehicleId}`) : Promise.reject(new Error('n/a'))),
    [query.data?.vehicleId],
  );

  async function runAction(action: () => Promise<unknown>) {
    setIsActing(true);
    setActionError(null);
    try {
      await action();
      query.refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsActing(false);
    }
  }

  async function handleConvert() {
    setIsActing(true);
    setActionError(null);
    try {
      const jobCard = await apiPost<{ id: string; jobCardNumber: string }>(`/estimates/${params.id}/convert-to-job-card`);
      setConvertedJobCard(jobCard);
      query.refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsActing(false);
    }
  }

  async function handleSaveDetails() {
    if (!query.data) return;
    await runAction(() =>
      apiPatch(`/estimates/${params.id}`, {
        jobDescription: (jobDescription ?? query.data!.jobDescription) || undefined,
        discountAmount: Number(discountAmount ?? query.data!.discountAmount),
      }),
    );
    setJobDescription(null);
    setDiscountAmount(null);
  }

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.error) {
    return <ErrorState message={query.error} onRetry={query.refetch} />;
  }

  const estimate = query.data;
  if (!estimate) return null;

  const isDraft = estimate.status === 'DRAFT';
  const detailsDirty = jobDescription !== null || discountAmount !== null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-ink">{estimate.jobDescription ?? 'Estimate'}</h1>
            <EstimateStatusBadge status={estimate.status} />
          </div>
          <p className="text-sm text-ink-secondary">Created {formatDate(estimate.createdAt)}</p>
        </div>
        <Link href="/estimates" className="self-center text-sm text-ink-secondary hover:text-ink">
          &larr; Back to estimates
        </Link>
      </div>

      {actionError ? <ErrorState message={actionError} /> : null}

      {convertedJobCard ? (
        <p className="rounded border border-success-100 bg-success-50 px-3 py-2 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
          Converted to job card{' '}
          <Link href={`/job-cards/${convertedJobCard.id}`} className="num font-medium underline">
            {convertedJobCard.jobCardNumber}
          </Link>
          .
        </p>
      ) : null}

      {canUpdate ? (
        <div className="flex flex-wrap gap-3">
          {estimate.status === 'DRAFT' ? (
            <Button onClick={() => runAction(() => apiPost(`/estimates/${params.id}/send`))} isLoading={isActing}>
              Send to Customer
            </Button>
          ) : null}
          {estimate.status === 'SENT' ? (
            <>
              <Button onClick={() => runAction(() => apiPost(`/estimates/${params.id}/approve`))} isLoading={isActing}>
                Mark Approved
              </Button>
              <Button
                variant="secondary"
                onClick={() => runAction(() => apiPost(`/estimates/${params.id}/reject`))}
                isLoading={isActing}
              >
                Mark Rejected
              </Button>
            </>
          ) : null}
          {estimate.status === 'APPROVED' ? (
            <Button onClick={handleConvert} isLoading={isActing}>
              Convert to Job Card
            </Button>
          ) : null}
        </div>
      ) : null}

      {vehicle.data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href={`/customers/${vehicle.data.customer.id}`}
            className="flex flex-col gap-0.5 rounded-lg border border-line bg-surface px-4 py-3 shadow-card hover:border-accent-400"
          >
            <span className="text-sm font-medium text-ink">{vehicle.data.customer.name}</span>
            <span className="num text-xs text-ink-muted">{vehicle.data.customer.mobile}</span>
          </Link>
          <Link
            href={`/vehicles/${vehicle.data.id}`}
            className="flex flex-col gap-0.5 rounded-lg border border-line bg-surface px-4 py-3 shadow-card hover:border-accent-400"
          >
            <span className="num text-sm font-medium text-ink">{vehicle.data.registrationNo}</span>
            <span className="text-xs text-ink-muted">
              {vehicle.data.brand} {vehicle.data.model}
            </span>
          </Link>
        </div>
      ) : null}

      {isDraft && canUpdate ? (
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <Input
              label="Job Description"
              value={jobDescription ?? estimate.jobDescription ?? ''}
              onChange={(e) => setJobDescription(e.target.value)}
            />
            <Input
              label="Discount Amount"
              type="number"
              value={discountAmount ?? estimate.discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              className="max-w-xs"
            />
            {detailsDirty ? (
              <div className="flex justify-end">
                <Button size="sm" onClick={handleSaveDetails} isLoading={isActing}>
                  Save Details
                </Button>
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardBody>
          <EstimateLineItems
            estimateId={estimate.id}
            lineItems={estimate.lineItems}
            readOnly={!canUpdate || !isDraft}
            onUpdated={query.refetch}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardBody className="flex max-w-xs flex-col gap-2">
          <SummaryRow label="Subtotal" value={formatMoney(estimate.subtotal)} />
          <SummaryRow label="GST" value={formatMoney(estimate.taxAmount)} />
          <SummaryRow label="Discount" value={`- ${formatMoney(estimate.discountAmount)}`} />
          <div className="border-t border-line pt-2">
            <SummaryRow label="Total" value={formatMoney(estimate.total)} emphasized />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
