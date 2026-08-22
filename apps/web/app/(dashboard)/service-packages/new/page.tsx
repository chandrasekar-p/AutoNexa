'use client';

import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api-client';
import type { ServicePackageFormValues } from '@/lib/validation/service-package';
import type { ServicePackage } from '@/lib/api-types';
import { ServicePackageForm } from '@/components/domain/service-package-form';
import { Card, CardBody } from '@/components/ui/card';

export default function NewServicePackagePage() {
  const router = useRouter();

  async function handleSubmit(values: ServicePackageFormValues) {
    const pkg = await apiPost<ServicePackage>('/service-packages', values);
    router.push(`/service-packages/${pkg.id}/edit`);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">New Service Package</h1>
        <p className="text-sm text-ink-secondary">Add a new AMC/service package to the catalogue.</p>
      </div>
      <Card>
        <CardBody className="pt-5">
          <ServicePackageForm submitLabel="Create Package" onSubmit={handleSubmit} onCancel={() => router.back()} />
        </CardBody>
      </Card>
    </div>
  );
}
