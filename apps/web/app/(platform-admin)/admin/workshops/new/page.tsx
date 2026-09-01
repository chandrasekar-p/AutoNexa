'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiPost, ApiError } from '@/lib/api-client';
import { validateCreateTenantForm, type CreateTenantFormErrors } from '@/lib/validation/tenant';
import type { Tenant } from '@/lib/api-types';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export default function NewWorkshopPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [gstin, setGstin] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [planTier, setPlanTier] = useState<'trial' | 'starter' | 'pro'>('trial');
  const [trialDays, setTrialDays] = useState('14');
  const [errors, setErrors] = useState<CreateTenantFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = validateCreateTenantForm({
      name,
      slug,
      gstin,
      ownerName,
      ownerEmail,
      ownerPassword,
      planTier,
      trialDays: planTier === 'trial' ? Number(trialDays) || undefined : undefined,
    });
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      const { tenant } = await apiPost<{ tenant: Tenant; ownerId: string }>('/tenants', result.data);
      router.push(`/admin/workshops/${tenant.id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/admin/workshops" className="text-sm text-ink-secondary hover:text-ink">
          &larr; Back to Workshops
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink">New Workshop</h1>
        <p className="text-sm text-ink-secondary">Provisions a new workshop tenant with its default roles and owner account.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workshop Details</CardTitle>
        </CardHeader>
        <CardBody className="pt-3">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Workshop Name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required />
              <Input
                label="Slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="premium-auto-cbe"
                error={errors.slug}
                required
              />
              <Input label="GSTIN (optional)" value={gstin} onChange={(e) => setGstin(e.target.value)} error={errors.gstin} />
            </div>

            <div className="border-t border-line pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-secondary">Owner Account</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Owner Name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} error={errors.ownerName} required />
                <Input
                  label="Owner Email"
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  error={errors.ownerEmail}
                  required
                />
                <Input
                  label="Owner Password"
                  type="password"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  error={errors.ownerPassword}
                  required
                />
              </div>
            </div>

            <div className="border-t border-line pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-secondary">Plan</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select label="Plan" value={planTier} onChange={(e) => setPlanTier(e.target.value as typeof planTier)}>
                  <option value="trial">Trial</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                </Select>
                {planTier === 'trial' ? (
                  <Input
                    label="Trial Length (days)"
                    type="number"
                    min={1}
                    value={trialDays}
                    onChange={(e) => setTrialDays(e.target.value)}
                    error={errors.trialDays}
                  />
                ) : null}
              </div>
            </div>

            {formError ? (
              <p
                role="alert"
                className="rounded border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400"
              >
                {formError}
              </p>
            ) : null}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => router.back()} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Create Workshop
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
