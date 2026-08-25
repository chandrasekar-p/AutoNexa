'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Car, User } from 'lucide-react';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { validateAppointmentForm, type AppointmentFormErrors, type AppointmentFormValues } from '@/lib/validation/appointment';
import type { Appointment, Customer, CustomerRef, PaginatedResult, VehicleListItem } from '@/lib/api-types';
import { CustomerPicker } from '@/components/domain/customer-picker';
import { AppointmentDetailsFields } from '@/components/domain/appointment-details-fields';
import { AppointmentStatusBadge } from '@/components/domain/appointment-status-badge';
import { useStaffOptions } from '@/lib/hooks/use-staff-options';
import { formatDate } from '@/lib/format';
import { Card, CardBody } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { cn } from '@/lib/cn';

const EMPTY_VEHICLES: PaginatedResult<VehicleListItem> = { items: [], total: 0, page: 1, pageSize: 100, totalPages: 0 };

const EMPTY_VALUES: AppointmentFormValues = {
  serviceType: '',
  appointmentDate: '',
  appointmentTime: '',
  serviceAdvisorId: '',
  technicianId: '',
  notes: '',
};

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-3" aria-label={`Step ${step} of 2`}>
      {([1, 2] as const).map((s, i) => (
        <div key={s} className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
              step === s
                ? 'bg-accent-500 text-white'
                : step > s
                  ? 'bg-success-500 text-white'
                  : 'bg-surface-hover text-ink-muted',
            )}
          >
            {step > s ? <Check className="h-4 w-4" aria-hidden /> : s}
          </div>
          <span className={cn('text-sm font-medium', step === s ? 'text-ink' : 'text-ink-muted')}>
            {s === 1 ? 'Details' : 'Review & Confirm'}
          </span>
          {i === 0 ? <div className="h-px w-10 bg-line sm:w-16" /> : null}
        </div>
      ))}
    </div>
  );
}

export default function NewAppointmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId');
  const preselectedVehicleId = searchParams.get('vehicleId');

  // Arriving from a customer/vehicle's own page (e.g. "Book Appointment")
  // pre-fills and locks that side of the pair; arriving at /appointments/new
  // directly shows the CustomerPicker + vehicle dropdown below instead.
  const preselectedCustomer = useApiQuery<Customer>(
    () => (preselectedCustomerId ? apiGet(`/customers/${preselectedCustomerId}`) : Promise.reject(new Error('n/a'))),
    [preselectedCustomerId],
  );

  const [step, setStep] = useState<1 | 2>(1);
  const [pickedCustomer, setPickedCustomer] = useState<CustomerRef | null>(null);
  const [vehicleId, setVehicleId] = useState(preselectedVehicleId ?? '');
  const [values, setValues] = useState<AppointmentFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<AppointmentFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const customer: CustomerRef | null = preselectedCustomerId ? preselectedCustomer.data : pickedCustomer;
  const staff = useStaffOptions();

  const vehicles = useApiQuery<PaginatedResult<VehicleListItem>>(
    () => (customer ? apiGet(`/vehicles?customerId=${customer.id}&pageSize=100`) : Promise.resolve(EMPTY_VEHICLES)),
    [customer?.id],
  );

  const selectedVehicle = vehicles.data?.items.find((v) => v.id === vehicleId) ?? null;

  function set<K extends keyof AppointmentFormValues>(key: K, value: AppointmentFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleNext() {
    const result = validateAppointmentForm(values);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setValues(result.data);
    setStep(2);
  }

  async function handleCreate() {
    if (!customer || !selectedVehicle) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      const appointment = await apiPost<Appointment>('/appointments', {
        ...values,
        customerId: customer.id,
        vehicleId: selectedVehicle.id,
      });
      router.push(`/appointments/${appointment.id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const canProceed = Boolean(customer && selectedVehicle);
  const staffName = (id: string | undefined) => staff.options.find((s) => s.id === id)?.name ?? '—';

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">New Appointment</h1>
        <p className="text-sm text-ink-secondary">Book a service appointment for a customer&rsquo;s vehicle.</p>
      </div>

      <StepIndicator step={step} />

      {preselectedCustomerId && preselectedCustomer.isLoading ? <Skeleton className="h-10 w-full max-w-sm" /> : null}
      {preselectedCustomerId && preselectedCustomer.error ? (
        <ErrorState message={preselectedCustomer.error} onRetry={preselectedCustomer.refetch} />
      ) : null}

      {step === 1 ? (
        <Card>
          <CardBody className="flex flex-col gap-6 pt-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-ink-secondary">Customer</span>
                {customer ? (
                  <div className="flex h-10 items-center justify-between rounded border border-line bg-surface-hover px-3">
                    <span className="flex items-center gap-2 truncate text-sm text-ink">
                      <User className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden />
                      {customer.name} <span className="num text-ink-muted">· {customer.mobile}</span>
                    </span>
                    {!preselectedCustomerId ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPickedCustomer(null);
                          setVehicleId('');
                        }}
                        className="shrink-0 text-xs text-accent-600 hover:underline"
                      >
                        Change
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <CustomerPicker value={pickedCustomer} onChange={setPickedCustomer} />
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-ink-secondary">Vehicle</span>
                {!customer ? (
                  <div className="flex h-10 items-center rounded border border-dashed border-line px-3 text-sm text-ink-muted">
                    Select a customer first
                  </div>
                ) : selectedVehicle ? (
                  <div className="flex h-10 items-center justify-between rounded border border-line bg-surface-hover px-3">
                    <span className="flex items-center gap-2 truncate text-sm text-ink">
                      <Car className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden />
                      <span className="num">{selectedVehicle.registrationNo}</span>{' '}
                      <span className="text-ink-muted">· {selectedVehicle.brand} {selectedVehicle.model}</span>
                    </span>
                    {!preselectedVehicleId ? (
                      <button type="button" onClick={() => setVehicleId('')} className="shrink-0 text-xs text-accent-600 hover:underline">
                        Change
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <>
                    {vehicles.isLoading ? <Skeleton className="h-10 w-full" /> : null}
                    {vehicles.error ? <ErrorState message={vehicles.error} onRetry={vehicles.refetch} /> : null}
                    {vehicles.data && vehicles.data.items.length === 0 ? (
                      <p className="flex h-10 items-center text-sm text-ink-muted">
                        No vehicles on file.{' '}
                        <Link href={`/vehicles/new?customerId=${customer.id}`} className="ml-1 text-accent-600 hover:underline">
                          Add one
                        </Link>
                      </p>
                    ) : null}
                    {vehicles.data && vehicles.data.items.length > 0 ? (
                      <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} aria-label="Select a vehicle">
                        <option value="">Select a vehicle…</option>
                        {vehicles.data.items.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.registrationNo} — {v.brand} {v.model}
                          </option>
                        ))}
                      </Select>
                    ) : null}
                  </>
                )}
              </div>
            </div>

            <div className="border-t border-line pt-5">
              <h2 className="mb-4 text-sm font-semibold text-ink">Appointment Details</h2>
              <AppointmentDetailsFields values={values} errors={errors} onChange={set} />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="button" onClick={handleNext} disabled={!canProceed}>
                Next: Review
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {step === 2 && customer && selectedVehicle ? (
        <Card>
          <CardBody className="flex flex-col gap-5 pt-5">
            <h2 className="text-sm font-semibold text-ink">Review appointment details</h2>

            {formError ? (
              <p
                role="alert"
                className="rounded border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400"
              >
                {formError}
              </p>
            ) : null}

            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-lg border border-line bg-surface-hover p-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-ink-muted">Customer</dt>
                <dd className="text-sm text-ink">
                  {customer.name} <span className="num text-ink-muted">· {customer.mobile}</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-ink-muted">Vehicle</dt>
                <dd className="num text-sm text-ink">
                  {selectedVehicle.registrationNo} <span className="text-ink-muted">· {selectedVehicle.brand} {selectedVehicle.model}</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-ink-muted">Service Type</dt>
                <dd className="text-sm text-ink">{values.serviceType}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-ink-muted">Date & Time</dt>
                <dd className="text-sm text-ink">
                  {formatDate(values.appointmentDate)} · {values.appointmentTime}
                </dd>
              </div>
              {staff.isAvailable ? (
                <>
                  <div>
                    <dt className="text-xs font-medium text-ink-muted">Service Advisor</dt>
                    <dd className="text-sm text-ink">{staffName(values.serviceAdvisorId)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-ink-muted">Technician</dt>
                    <dd className="text-sm text-ink">{staffName(values.technicianId)}</dd>
                  </div>
                </>
              ) : null}
              <div>
                <dt className="text-xs font-medium text-ink-muted">Status</dt>
                <dd>
                  <AppointmentStatusBadge status="SCHEDULED" />
                </dd>
              </div>
              {values.notes ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-ink-muted">Notes</dt>
                  <dd className="whitespace-pre-wrap text-sm text-ink">{values.notes}</dd>
                </div>
              ) : null}
            </dl>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setStep(1)} disabled={isSubmitting}>
                Back
              </Button>
              <Button type="button" onClick={handleCreate} isLoading={isSubmitting}>
                Create Appointment
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
