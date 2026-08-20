'use client';

import { useState } from 'react';
import { apiPost, ApiError } from '@/lib/api-client';
import type { PurchaseOrderItem } from '@/lib/api-types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';

interface GoodsReceiptFormProps {
  purchaseOrderId: string;
  items: PurchaseOrderItem[];
  onReceived: () => void;
}

/** Only shown for items with outstanding quantity — see the PO detail page's status gate (SENT/PARTIALLY_RECEIVED only). */
export function GoodsReceiptForm({ purchaseOrderId, items, onReceived }: GoodsReceiptFormProps) {
  const outstandingItems = items.filter((i) => i.quantityReceived < i.quantityOrdered);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const payload = outstandingItems
      .map((item) => ({
        purchaseOrderItemId: item.id,
        quantityReceived: Number(quantities[item.id] ?? 0),
      }))
      .filter((line) => line.quantityReceived > 0);

    if (payload.length === 0) {
      setError('Enter a quantity for at least one item.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await apiPost(`/purchase-orders/${purchaseOrderId}/receive`, { items: payload, notes: notes || undefined });
      setQuantities({});
      setNotes('');
      onReceived();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not record receipt.');
    } finally {
      setIsSaving(false);
    }
  }

  if (outstandingItems.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receive Goods</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        {outstandingItems.map((item) => {
          const outstanding = item.quantityOrdered - item.quantityReceived;
          return (
            <div key={item.id} className="flex items-center justify-between gap-3">
              <span className="text-sm text-ink">
                {item.part.partNumber} <span className="text-ink-muted">— {item.part.name}</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="num text-xs text-ink-muted">{outstanding} outstanding</span>
                <Input
                  type="number"
                  value={quantities[item.id] ?? ''}
                  onChange={(e) => setQuantities((q) => ({ ...q, [item.id]: e.target.value }))}
                  placeholder="Qty"
                  className="h-9 w-24"
                  aria-label={`Quantity received for ${item.part.partNumber}`}
                />
              </div>
            </div>
          );
        })}
        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        {error ? <p className="text-xs text-danger-600 dark:text-danger-400">{error}</p> : null}
        <div className="flex justify-end">
          <Button type="button" onClick={handleSubmit} isLoading={isSaving}>
            Record Receipt
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
