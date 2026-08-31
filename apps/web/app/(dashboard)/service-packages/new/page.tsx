'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { apiPost } from '@/lib/api-client';
import type { ServicePackageFormValues } from '@/lib/validation/service-package';
import type { ServicePackage } from '@/lib/api-types';
import { ServicePackageForm } from '@/components/domain/service-package-form';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';

export default function NewServicePackagePage() {
  const router = useRouter();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(values: ServicePackageFormValues) {
    // Errors are caught and displayed inline by ServicePackageForm itself.
    const pkg = await apiPost<ServicePackage>('/service-packages', values);
    setSuccessMessage('Package created successfully.');
    setTimeout(() => router.push(`/service-packages/${pkg.id}`), 900);
  }

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">New Service Package</h1>
          <p className="text-sm text-ink-secondary">Create a new AMC/service package for your customers.</p>
        </div>
        <Link href="/service-packages">
          <Button type="button" variant="secondary" size="sm">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Back to Packages
          </Button>
        </Link>
      </div>

      <Card>
        <CardBody className="pt-5">
          <ServicePackageForm submitLabel="Create Package" onSubmit={handleSubmit} onCancel={() => router.push('/service-packages')} />
        </CardBody>
      </Card>

      {successMessage ? <Toast message={successMessage} onDismiss={() => setSuccessMessage(null)} /> : null}
    </div>
  );
}
