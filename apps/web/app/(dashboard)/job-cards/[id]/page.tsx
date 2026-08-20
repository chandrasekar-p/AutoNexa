'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet, apiPatch, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { useStaffOptions } from '@/lib/hooks/use-staff-options';
import { getValidJobCardTransitions } from '@/lib/job-card-transitions';
import { formatDate, formatMoney } from '@/lib/format';
import type { JobCardDetail, JobCardStatus, PaginatedResult, Technician } from '@/lib/api-types';
import { JobCardStatusBadge } from '@/components/domain/job-card-status-badge';
import { JobCardLabourLines } from '@/components/domain/job-card-labour-lines';
import { JobCardPartLines } from '@/components/domain/job-card-part-lines';
import { JobCardNotes } from '@/components/domain/job-card-notes';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

const STATUS_ACTION_LABEL: Record<JobCardStatus, string> = {
  OPEN: 'Open',
  DIAGNOSIS: 'Start Diagnosis',
  WAITING_APPROVAL: 'Send for Approval',
  APPROVED: 'Mark Approved',
  IN_PROGRESS: 'Start Work',
  WAITING_PARTS: 'Waiting on Parts',
  QUALITY_CHECK: 'Send to Quality Check',
  READY_FOR_DELIVERY: 'Mark Ready for Delivery',
  DELIVERED: 'Mark Delivered',
  CANCELLED: 'Cancel Job Card',
};
const GENERATABLE_INVOICE_STATUSES: JobCardStatus[] = ['READY_FOR_DELIVERY', 'DELIVERED'];
const TERMINAL_STATUSES: JobCardStatus[] = ['DELIVERED', 'CANCELLED'];

export default function JobCardDetailPage() {
  const params = useParams<{ id: string }>();
  const canUpdate = usePermission('job-card:update');
  const canGenerateInvoice = usePermission('invoice:create');

  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [generatedInvoice, setGeneratedInvoice] = useState<{ id: string; invoiceNumber: string; grandTotal: string } | null>(
    null,
  );
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

  const [complaint, setComplaint] = useState<string | null>(null);
  const [customerRequest, setCustomerRequest] = useState<string | null>(null);
  const [estimatedWork, setEstimatedWork] = useState<string | null>(null);
  const [odometer, setOdometer] = useState<string | null>(null);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [serviceAdvisorId, setServiceAdvisorId] = useState<string | null>(null);
  const [expectedDelivery, setExpectedDelivery] = useState<string | null>(null);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const query = useApiQuery<JobCardDetail>(() => apiGet(`/job-cards/${params.id}`), [params.id]);
  const technicians = useApiQuery<PaginatedResult<Technician>>(() => apiGet('/technicians?pageSize=100'), []);
  const staff = useStaffOptions();

  async function handleStatusChange(status: JobCardStatus) {
    if (status === 'CANCELLED' && !window.confirm('Cancel this job card? This cannot be undone.')) return;
    setIsChangingStatus(true);
    setActionError(null);
    try {
      await apiPatch(`/job-cards/${params.id}/status`, { status });
      query.refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsChangingStatus(false);
    }
  }

  async function handleGenerateInvoice() {
    setIsGeneratingInvoice(true);
    setActionError(null);
    try {
      const invoice = await apiPost<{ id: string; invoiceNumber: string; grandTotal: string }>(
        `/job-cards/${params.id}/generate-invoice`,
      );
      setGeneratedInvoice(invoice);
      query.refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsGeneratingInvoice(false);
    }
  }

  async function handleSaveDetails() {
    if (!query.data) return;
    setIsSavingDetails(true);
    setDetailsError(null);
    try {
      await apiPatch(`/job-cards/${params.id}`, {
        complaint: (complaint ?? query.data.complaint ?? '') || undefined,
        customerRequest: (customerRequest ?? query.data.customerRequest ?? '') || undefined,
        estimatedWork: (estimatedWork ?? query.data.estimatedWork ?? '') || undefined,
        odometer: odometer !== null ? Number(odometer) : (query.data.odometer ?? undefined),
        technicianId: (technicianId ?? query.data.technicianId ?? '') || undefined,
        serviceAdvisorId: (serviceAdvisorId ?? query.data.serviceAdvisorId ?? '') || undefined,
        expectedDelivery: (expectedDelivery ?? query.data.expectedDelivery?.slice(0, 10) ?? '') || undefined,
      });
      setComplaint(null);
      setCustomerRequest(null);
      setEstimatedWork(null);
      setOdometer(null);
      setTechnicianId(null);
      setServiceAdvisorId(null);
      setExpectedDelivery(null);
      query.refetch();
    } catch (err) {
      setDetailsError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSavingDetails(false);
    }
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

  const jobCard = query.data;
  if (!jobCard) return null;

  const transitions = getValidJobCardTransitions(jobCard.status);
  const isTerminal = TERMINAL_STATUSES.includes(jobCard.status);
  const linesReadOnly = !canUpdate || isTerminal; // UI-only guard — see JobCardLabourLines' doc comment: the backend doesn't actually block this for labour, only for removePart.
  const detailsDirty =
    complaint !== null ||
    customerRequest !== null ||
    estimatedWork !== null ||
    odometer !== null ||
    technicianId !== null ||
    serviceAdvisorId !== null ||
    expectedDelivery !== null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="num text-2xl font-semibold text-ink">{jobCard.jobCardNumber}</h1>
            <JobCardStatusBadge status={jobCard.status} />
          </div>
          <p className="text-sm text-ink-secondary">
            {jobCard.vehicle.registrationNo} · {jobCard.customer.name}
          </p>
        </div>
        <Link href="/job-cards" className="self-center text-sm text-ink-secondary hover:text-ink">
          &larr; Back to job cards
        </Link>
      </div>

      {actionError ? <ErrorState message={actionError} /> : null}

      {generatedInvoice ? (
        <p className="rounded border border-success-100 bg-success-50 px-3 py-2 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
          Invoice{' '}
          <Link href={`/invoices/${generatedInvoice.id}`} className="num font-medium underline">
            {generatedInvoice.invoiceNumber}
          </Link>{' '}
          generated — {formatMoney(generatedInvoice.grandTotal)}.
        </p>
      ) : null}

      {canUpdate ? (
        <div className="flex flex-wrap gap-3">
          {transitions.map((status) => (
            <Button
              key={status}
              variant={status === 'CANCELLED' ? 'danger' : 'primary'}
              onClick={() => handleStatusChange(status)}
              isLoading={isChangingStatus}
            >
              {STATUS_ACTION_LABEL[status]}
            </Button>
          ))}
          {canGenerateInvoice && GENERATABLE_INVOICE_STATUSES.includes(jobCard.status) ? (
            <Button variant="secondary" onClick={handleGenerateInvoice} isLoading={isGeneratingInvoice}>
              Generate Invoice
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href={`/customers/${jobCard.customer.id}`}
          className="flex flex-col gap-0.5 rounded-lg border border-line bg-surface px-4 py-3 shadow-card hover:border-accent-400"
        >
          <span className="text-sm font-medium text-ink">{jobCard.customer.name}</span>
          <span className="num text-xs text-ink-muted">{jobCard.customer.mobile}</span>
        </Link>
        <Link
          href={`/vehicles/${jobCard.vehicle.id}`}
          className="flex flex-col gap-0.5 rounded-lg border border-line bg-surface px-4 py-3 shadow-card hover:border-accent-400"
        >
          <span className="num text-sm font-medium text-ink">{jobCard.vehicle.registrationNo}</span>
          <span className="text-xs text-ink-muted">
            {jobCard.vehicle.brand} {jobCard.vehicle.model}
          </span>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Textarea
              label="Complaint"
              value={complaint ?? jobCard.complaint ?? ''}
              onChange={(e) => setComplaint(e.target.value)}
              disabled={!canUpdate}
            />
            <Textarea
              label="Customer Request"
              value={customerRequest ?? jobCard.customerRequest ?? ''}
              onChange={(e) => setCustomerRequest(e.target.value)}
              disabled={!canUpdate}
            />
            <Textarea
              label="Estimated Work"
              value={estimatedWork ?? jobCard.estimatedWork ?? ''}
              onChange={(e) => setEstimatedWork(e.target.value)}
              disabled={!canUpdate}
            />
            <Input
              label="Odometer (km)"
              type="number"
              value={odometer ?? jobCard.odometer ?? ''}
              onChange={(e) => setOdometer(e.target.value)}
              disabled={!canUpdate}
            />
            <Input
              label="Expected Delivery"
              type="date"
              value={expectedDelivery ?? jobCard.expectedDelivery?.slice(0, 10) ?? ''}
              onChange={(e) => setExpectedDelivery(e.target.value)}
              disabled={!canUpdate}
            />
            {jobCard.actualDelivery ? <Input label="Actual Delivery" value={formatDate(jobCard.actualDelivery)} disabled /> : null}
            {technicians.data && technicians.data.items.length > 0 ? (
              <Select
                label="Technician"
                value={technicianId ?? jobCard.technicianId ?? ''}
                onChange={(e) => setTechnicianId(e.target.value)}
                disabled={!canUpdate}
              >
                <option value="">—</option>
                {technicians.data.items.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.user.name}
                  </option>
                ))}
              </Select>
            ) : null}
            {staff.isAvailable ? (
              <Select
                label="Service Advisor"
                value={serviceAdvisorId ?? jobCard.serviceAdvisorId ?? ''}
                onChange={(e) => setServiceAdvisorId(e.target.value)}
                disabled={!canUpdate}
              >
                <option value="">—</option>
                {staff.options.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            ) : null}
          </div>

          {detailsError ? <p className="text-xs text-danger-600 dark:text-danger-400">{detailsError}</p> : null}

          {canUpdate && detailsDirty ? (
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSaveDetails} isLoading={isSavingDetails}>
                Save Changes
              </Button>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Labour</CardTitle>
        </CardHeader>
        <CardBody>
          <JobCardLabourLines
            jobCardId={jobCard.id}
            lines={jobCard.labourItems}
            readOnly={linesReadOnly}
            onUpdated={query.refetch}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parts</CardTitle>
        </CardHeader>
        <CardBody>
          <JobCardPartLines jobCardId={jobCard.id} lines={jobCard.parts} readOnly={linesReadOnly} onUpdated={query.refetch} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardBody>
          <JobCardNotes jobCardId={jobCard.id} notes={jobCard.notes} canAdd={canUpdate} onAdded={query.refetch} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status History</CardTitle>
        </CardHeader>
        <CardBody>
          {jobCard.statusHistory.length === 0 ? (
            <p className="text-sm text-ink-muted">No status changes yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {jobCard.statusHistory.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-ink">
                    {entry.fromStatus ? `${entry.fromStatus} → ${entry.toStatus}` : `Created as ${entry.toStatus}`}
                  </span>
                  <span className="text-xs text-ink-muted">{formatDate(entry.changedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
