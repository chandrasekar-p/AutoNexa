'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { formatMoney, formatNumber, formatDate } from '@/lib/format';
import type { JobCardListItem, PaginatedResult, TechnicianDetail } from '@/lib/api-types';
import { TechnicianStatusBadge } from '@/components/domain/technician-status-badge';
import { TechnicianAvailabilityBadge } from '@/components/domain/technician-availability-badge';
import { WorkloadBar } from '@/components/domain/workload-bar';
import { JobCardStatusBadge } from '@/components/domain/job-card-status-badge';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-micro font-semibold uppercase tracking-wide text-ink-secondary">{label}</span>
      <span className="num text-2xl font-semibold text-ink">{value}</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-micro font-semibold uppercase tracking-wide text-ink-secondary">{label}</span>
      <span className="text-sm text-ink">{value}</span>
    </div>
  );
}

const WORKING_DAY_LABEL: Record<string, string> = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun' };

export default function TechnicianDetailPage() {
  const params = useParams<{ id: string }>();
  const canUpdate = usePermission('technician:update');

  const query = useApiQuery<TechnicianDetail>(() => apiGet(`/technicians/${params.id}`), [params.id]);
  const recentJobCards = useApiQuery<PaginatedResult<JobCardListItem>>(
    () => apiGet(`/job-cards?technicianId=${params.id}&pageSize=5`),
    [params.id],
  );

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

  const technician = query.data;
  if (!technician) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-ink">{technician.user.name}</h1>
            <TechnicianStatusBadge status={technician.status} />
            <TechnicianAvailabilityBadge availability={technician.availability} />
          </div>
          <p className="num text-sm text-ink-secondary">{technician.employeeId ?? '—'}</p>
        </div>
        <div className="flex gap-2">
          {canUpdate ? (
            <Link href={`/technicians/${technician.id}/edit`}>
              <Button type="button" size="sm">
                <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Edit Technician
              </Button>
            </Link>
          ) : null}
          <Link href="/technicians" className="self-center text-sm text-ink-secondary hover:text-ink">
            &larr; Back to technicians
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardBody className="py-4">
            <Stat label="Active Jobs" value={formatNumber(technician.jobsOpen)} />
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <Stat label="Completed Today" value={formatNumber(technician.completedToday)} />
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <Stat label="Hours Today" value={technician.hoursToday} />
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <Stat
              label="Avg. Completion Time"
              value={technician.avgCompletionDays !== null ? `${technician.avgCompletionDays.toFixed(1)}d` : '—'}
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full Name" value={technician.user.name} />
          <Field label="Phone" value={technician.user.phone ?? '—'} />
          <Field label="Email" value={technician.user.email} />
          <Field label="Employee ID" value={technician.employeeId ?? '—'} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skills & Specialisation</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
          <Field label="Specialisation" value={technician.specialisation ?? '—'} />
          <div className="flex flex-col gap-1">
            <span className="text-micro font-semibold uppercase tracking-wide text-ink-secondary">Skills</span>
            {technician.skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {technician.skills.map((skill) => (
                  <span key={skill} className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-medium text-ink-secondary">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-sm text-ink">—</span>
            )}
          </div>
          <Field label="Experience" value={technician.experienceYears !== null ? `${technician.experienceYears} years` : '—'} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workload</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Current Assigned Jobs" value={formatNumber(technician.jobsOpen)} />
          <Field label="Completed Jobs" value={formatNumber(technician.jobsCompleted)} />
          <Field label="Working Days" value={technician.workingDays.map((d) => WORKING_DAY_LABEL[d] ?? d).join(', ') || '—'} />
          <Field
            label="Working Hours"
            value={technician.workingHoursStart && technician.workingHoursEnd ? `${technician.workingHoursStart} – ${technician.workingHoursEnd}` : '—'}
          />
          <div className="sm:col-span-2 lg:col-span-4">
            <span className="mb-1 block text-micro font-semibold uppercase tracking-wide text-ink-secondary">Workload</span>
            <WorkloadBar percent={technician.workloadPercent} className="max-w-sm" />
          </div>
          <Field label="Labour Hours (Lifetime)" value={technician.totalLabourHours} />
          <Field label="Revenue Generated" value={formatMoney(technician.revenueGenerated)} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Job Cards</CardTitle>
        </CardHeader>
        <CardBody>
          {recentJobCards.isLoading ? <Skeleton className="h-10 w-full" /> : null}
          {recentJobCards.error ? <ErrorState message={recentJobCards.error} onRetry={recentJobCards.refetch} /> : null}
          {recentJobCards.data && recentJobCards.data.items.length === 0 ? (
            <p className="text-sm text-ink-muted">No job cards assigned yet.</p>
          ) : null}
          {recentJobCards.data && recentJobCards.data.items.length > 0 ? (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Job Card #</TableHeaderCell>
                  <TableHeaderCell>Vehicle</TableHeaderCell>
                  <TableHeaderCell>Customer</TableHeaderCell>
                  <TableHeaderCell>Service</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Assigned Date</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {recentJobCards.data.items.map((jobCard) => (
                  <TableRow key={jobCard.id}>
                    <TableCell className="num font-medium">
                      <Link href={`/job-cards/${jobCard.id}`} className="hover:text-accent-600">
                        {jobCard.jobCardNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="num text-ink-secondary">{jobCard.vehicle.registrationNo}</TableCell>
                    <TableCell className="text-ink-secondary">{jobCard.customer.name}</TableCell>
                    <TableCell className="text-ink-secondary">{jobCard.complaint ?? '—'}</TableCell>
                    <TableCell>
                      <JobCardStatusBadge status={jobCard.status} />
                    </TableCell>
                    <TableCell className="text-ink-secondary">{formatDate(jobCard.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
