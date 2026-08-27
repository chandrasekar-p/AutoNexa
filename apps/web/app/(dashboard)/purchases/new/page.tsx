'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { Part, PurchaseOrderDetail, Supplier, SupplierRef } from '@/lib/api-types';
import { SupplierPicker } from '@/components/domain/supplier-picker';
import { PurchaseOrderItemsBuilder, type PurchaseOrderDraftItem } from '@/components/domain/purchase-order-items-builder';
import { Card, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

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

  const [pickedSupplier, setPickedSupplier] = useState<SupplierRef | null>(null);
  const supplier: SupplierRef | null = preselectedSupplierId ? preselectedSupplier.data : pickedSupplier;

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
          quantityOrdered: Math.max(part.minStock - part.currentStock, 1),
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
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">New Purchase Order</h1>
        <p className="text-sm text-ink-secondary">Items are fixed once the order is created — receiving is tracked separately.</p>
      </div>

      {preselectedSupplierId && preselectedSupplier.isLoading ? <Skeleton className="h-10 w-full max-w-sm" /> : null}
      {preselectedSupplierId && preselectedSupplier.error ? (
        <ErrorState message={preselectedSupplier.error} onRetry={preselectedSupplier.refetch} />
      ) : null}
      {preselectedPartId && preselectedPart.isLoading ? <Skeleton className="h-10 w-full max-w-sm" /> : null}
      {preselectedPartId && preselectedPart.error ? <ErrorState message={preselectedPart.error} onRetry={preselectedPart.refetch} /> : null}

      <Card>
        <CardBody className="flex flex-col gap-5 pt-5">
          {!preselectedSupplierId && !supplier ? <SupplierPicker value={pickedSupplier} onChange={setPickedSupplier} /> : null}

          {supplier ? (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
              <div className="flex h-10 items-center justify-between rounded border border-line bg-surface-hover px-3">
                <span className="text-sm text-ink">{supplier.name}</span>
                {!preselectedSupplierId ? (
                  <button type="button" onClick={() => setPickedSupplier(null)} className="text-xs text-accent-600 hover:underline">
                    Change
                  </button>
                ) : null}
              </div>

              <PurchaseOrderItemsBuilder items={items} onChange={setItems} />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Expected Delivery Date"
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                />
              </div>
              <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

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
                  Create Purchase Order
                </Button>
              </div>
            </form>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
