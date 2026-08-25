'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Bell, MessageCircle } from 'lucide-react';
import { ApiError } from '@/lib/api-client';
import { validateCustomerForm, type CustomerFormErrors, type CustomerFormValues } from '@/lib/validation/customer';
import { INDIAN_STATES, MAJOR_CITIES_BY_STATE } from '@/lib/data/india-states';
import type { Customer } from '@/lib/api-types';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { SectionHeading } from '@/components/domain/section-heading';

interface CustomerFormProps {
  initial?: Customer;
  submitLabel: string;
  onSubmit: (values: CustomerFormValues) => Promise<void>;
  onCancel: () => void;
  /** Extra content rendered below Communication Preferences in the right-hand column — used by the New Customer page for its "What's Next?" panel. Edit doesn't pass one. */
  sidebarExtra?: ReactNode;
}

const OTHER_CITY = '__other__';

/**
 * Shared between the create (/customers/new) and edit (/customers/[id]/edit)
 * pages — same fields, same validation, same two-column layout either way.
 * The backend's PATCH accepts a partial payload, but we always send the
 * full form here for simplicity; there's no meaningful difference for the
 * user.
 */
export function CustomerForm({ initial, submitLabel, onSubmit, onCancel, sidebarExtra }: CustomerFormProps) {
  const [values, setValues] = useState({
    name: initial?.name ?? '',
    mobile: initial?.mobile ?? '',
    altMobile: initial?.altMobile ?? '',
    email: initial?.email ?? '',
    address: initial?.address ?? '',
    city: initial?.city ?? '',
    state: initial?.state ?? '',
    gstin: initial?.gstin ?? '',
    customerType: initial?.customerType ?? 'individual',
    notes: initial?.notes ?? '',
    reminderOptOut: initial?.reminderOptOut ?? false,
    notifyByWhatsappSms: initial?.notifyByWhatsappSms ?? true,
  });
  const [errors, setErrors] = useState<CustomerFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const citySuggestions = MAJOR_CITIES_BY_STATE[values.state] ?? [];
  // True only when editing a customer whose already-stored city isn't one
  // of the suggestions for their already-stored state — so we show their
  // real value as free text instead of silently hiding it behind a
  // dropdown that doesn't contain it. Reset to false on every subsequent
  // state change (see handleStateChange) — picking a (new) state should
  // always surface that state's dropdown, per the ask that follows "load
  // cities" from a state selection, not stay stuck in free-text mode.
  const [forceCustomCity, setForceCustomCity] = useState(
    () => !!(initial?.city && !(MAJOR_CITIES_BY_STATE[initial.state ?? '']?.includes(initial.city))),
  );
  const cityMode: 'select' | 'custom' = citySuggestions.length > 0 && !forceCustomCity ? 'select' : 'custom';

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleStateChange(newState: string) {
    // A city picked for the old state rarely also belongs to the new one —
    // clear it, and prefer showing the new state's dropdown (not whatever
    // mode was active before) so cities actually load right after picking
    // a state, without an extra "choose from list" click.
    setForceCustomCity(false);
    setValues((v) => ({ ...v, state: newState, city: '' }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = validateCustomerForm(values);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      await onSubmit(result.data);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {formError ? (
        <p role="alert" className="rounded border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400">
          {formError}
        </p>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardBody className="flex flex-col gap-4 pt-5">
              <SectionHeading number={1} title="Basic Information" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Customer Name" value={values.name} onChange={(e) => set('name', e.target.value)} error={errors.name} required />
                <Input
                  label="Mobile Number"
                  value={values.mobile}
                  onChange={(e) => set('mobile', e.target.value)}
                  placeholder="+91 98765 43210"
                  error={errors.mobile}
                  required
                />
                <Input
                  label="Alternate Mobile"
                  value={values.altMobile}
                  onChange={(e) => set('altMobile', e.target.value)}
                  placeholder="+91 98765 43210"
                  error={errors.altMobile}
                />
                <Input label="Email Address" type="email" value={values.email} onChange={(e) => set('email', e.target.value)} error={errors.email} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex flex-col gap-4 pt-5">
              <SectionHeading number={2} title="Address & Business Details" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select label="State" value={values.state} onChange={(e) => handleStateChange(e.target.value)} error={errors.state}>
                  <option value="">Select state</option>
                  {/* A pre-existing customer's state from before this was a dropdown (free text) surfaces here too, if it doesn't match the canonical list — never silently hidden. */}
                  {values.state && !INDIAN_STATES.includes(values.state) ? (
                    <option value={values.state}>{values.state}</option>
                  ) : null}
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </Select>
                {citySuggestions.length > 0 && cityMode === 'select' ? (
                  <div className="flex flex-col gap-1.5">
                    <Select
                      label="City / District"
                      value={citySuggestions.includes(values.city) ? values.city : ''}
                      onChange={(e) => {
                        if (e.target.value === OTHER_CITY) {
                          setForceCustomCity(true);
                          set('city', '');
                        } else {
                          set('city', e.target.value);
                        }
                      }}
                      error={errors.city}
                    >
                      <option value="">Select city</option>
                      {citySuggestions.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                      <option value={OTHER_CITY}>Other (type manually)</option>
                    </Select>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <Input
                      label="City / District"
                      value={values.city}
                      onChange={(e) => set('city', e.target.value)}
                      error={errors.city}
                      placeholder="Enter city or district"
                    />
                    {citySuggestions.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setForceCustomCity(false);
                          set('city', '');
                        }}
                        className="self-start text-xs text-accent-600 hover:underline"
                      >
                        ← Choose from list
                      </button>
                    ) : (
                      <p className="text-xs text-ink-muted">Select a state to see suggested cities.</p>
                    )}
                  </div>
                )}
                <Input
                  label="GSTIN (Optional)"
                  value={values.gstin}
                  onChange={(e) => set('gstin', e.target.value.toUpperCase())}
                  error={errors.gstin}
                />
                <Select
                  label="Customer Type"
                  value={values.customerType}
                  onChange={(e) => set('customerType', e.target.value as CustomerFormValues['customerType'])}
                  error={errors.customerType}
                >
                  <option value="individual">Individual</option>
                  <option value="business">Business</option>
                </Select>
              </div>
              <Textarea label="Address" value={values.address} onChange={(e) => set('address', e.target.value)} error={errors.address} />
              <Textarea label="Notes (Optional)" value={values.notes} onChange={(e) => set('notes', e.target.value)} error={errors.notes} />
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardBody className="flex flex-col gap-4 pt-5">
              <SectionHeading number={3} title="Communication Preferences" />

              <label className="flex items-start justify-between gap-3 text-sm">
                <span className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={!values.reminderOptOut}
                    onChange={(e) => set('reminderOptOut', !e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-accent-500"
                  />
                  <span>
                    <span className="font-medium text-ink">Send Service Reminders</span>
                    <br />
                    <span className="text-xs text-ink-muted">Receive reminders for next service, insurance and PUC expiry.</span>
                  </span>
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-400">
                  <Bell className="h-4 w-4" aria-hidden />
                </span>
              </label>

              <label className="flex items-start justify-between gap-3 text-sm">
                <span className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={values.notifyByWhatsappSms}
                    onChange={(e) => set('notifyByWhatsappSms', e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-accent-500"
                  />
                  <span>
                    <span className="font-medium text-ink">Send WhatsApp / SMS Updates</span>
                    <br />
                    <span className="text-xs text-ink-muted">Receive appointment, estimate, invoice and payment notifications.</span>
                  </span>
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400">
                  <MessageCircle className="h-4 w-4" aria-hidden />
                </span>
              </label>

              <p className="rounded-lg bg-surface-hover px-3 py-2.5 text-xs text-ink-secondary">
                <strong className="font-medium text-ink">Transactional messages</strong> (invoices, payments, appointments) will always be
                sent by Email regardless of these preferences.
              </p>
            </CardBody>
          </Card>

          {sidebarExtra}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
