'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { Part, PurchaseOrderDetail, Supplier } from '@/lib/api-types';
import { SupplierPicker } from '@/components/domain/supplier-picker';
import { PurchaseOrderItemsBuilder, type PurchaseOrderDraftItem } from '@/components/domain/purchase-order-items-builder';
import { Card, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">{children}</h2>;
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSupplierId = searchParams.get('supplierId');
  // From a Part's "Create Purchase Order" quick action — pre-seeds one
  // draft line for that part instead of leaving the builder empty, with a
  // reorder quantity suggested from data already on hand (how far below
  // minStock it currently is), not a fabricated default.
  const preselectedPartId = searchParams.get('partId');

  const preselectedSupplier = useApiQuery<Supplier>(
    () => (preselectedSupplierId ? apiGet(`/suppliers/${preselectedSupplierId}`) : Promise.reject(new Error('n/a'))),
    [preselectedSupplierId],
  );
  const preselectedPart = useApiQuery<Part>(
    () => (preselectedPartId ? apiGet(`/parts/${preselectedPartId}`) : Promise.reject(new Error('n/a'))),
    [preselectedPartId],
  );

  const [pickedSupplier, setPickedSupplier] = useState<Supplier | null>(null);
  const supplier: Supplier | null = preselectedSupplierId ? preselectedSupplier.data : pickedSupplier;

  const [items, setItems] = useState<PurchaseOrderDraftItem[]>([]);

  // Seeds exactly once when the preselected part loads — doesn't re-run
  // on later renders, so removing/editing the seeded line (or adding
  // more) via the builder isn't fought by this effect.
  useEffect(() => {
    if (!preselectedPart.data) return;
    setItems((current) => {
      if (current.length > 0) return current;
      const part = preselectedPart.data!;
      return [
        {
          key: part.id,
          part,
          quantityOrdered: Math.max(Number(part.minStock) - Number(part.currentStock), 1),
          unitCost: Number(part.purchasePrice),
          gstRate: Number(part.gstRate),
        },
      ];
    });
  }, [preselectedPart.data]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = !!supplier && items.length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supplier) return;
    if (items.length === 0) {
      setFormError('Add at least one item to the order.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      const po = await apiPost<PurchaseOrderDetail>('/purchase-orders', {
        supplierId: supplier.id,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        notes: notes || undefined,
        items: items.map((i) => ({
          partId: i.part.id,
          quantityOrdered: i.quantityOrdered,
          unitCost: i.unitCost,
          gstRate: i.gstRate,
        })),
      });
      router.push(`/purchases/${po.id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">New Purchase Order</h1>
          <p className="text-sm text-ink-secondary">Create a purchase order for supplier parts.</p>
        </div>
        <Link href="/purchases">
          <Button type="button" variant="secondary" size="sm">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Back to Purchase Orders
          </Button>
        </Link>
      </div>

      {preselectedSupplierId && preselectedSupplier.isLoading ? <Skeleton className="h-10 w-full max-w-sm" /> : null}
      {preselectedSupplierId && preselectedSupplier.error ? (
        <ErrorState message={preselectedSupplier.error} onRetry={preselectedSupplier.refetch} />
      ) : null}
      {preselectedPartId && preselectedPart.isLoading ? <Skeleton className="h-10 w-full max-w-sm" /> : null}
      {preselectedPartId && preselectedPart.error ? <ErrorState message={preselectedPart.error} onRetry={preselectedPart.refetch} /> : null}

      <Card>
        <CardBody className="flex flex-col gap-6 pt-5">
          <div className="flex flex-col gap-2">
            <SectionTitle>Supplier</SectionTitle>
            {!preselectedSupplierId ? <SupplierPicker value={pickedSupplier} onChange={setPickedSupplier} /> : null}
            {preselectedSupplierId && supplier ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex h-10 items-center justify-between rounded border border-line bg-surface px-3">
                  <span className="text-sm font-medium text-ink">{supplier.name}</span>
                </div>
              </div>
            ) : null}
          </div>

          {supplier ? (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
              <div className="flex flex-col gap-2 border-t border-line pt-4">
                <SectionTitle>Order Items</SectionTitle>
                <PurchaseOrderItemsBuilder items={items} onChange={setItems} />
              </div>

              <div className="grid grid-cols-1 gap-4 border-t border-line pt-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <SectionTitle>Delivery</SectionTitle>
                  <DatePicker
                    label="Expected Delivery Date"
                    value={expectedDeliveryDate}
                    onChange={setExpectedDeliveryDate}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <SectionTitle>Notes</SectionTitle>
                  <Textarea label="" aria-label="Notes" placeholder="Add purchase order notes…" value={notes} onChange={(e) => setNotes(e.target.value)} />
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

              <div className="flex justify-end gap-3 border-t border-line pt-4">
                <Button type="button" variant="secondary" onClick={() => router.push('/purchases')} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSubmitting} disabled={!canSubmit}>
                  {isSubmitting ? 'Creating Purchase Order…' : 'Create Purchase Order'}
                </Button>
              </div>
            </form>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
