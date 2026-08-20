'use client';

import { useState } from 'react';
import { formatMoney } from '@/lib/format';
import type { PartRef } from '@/lib/api-types';
import { PartPicker } from '@/components/domain/part-picker';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

export interface PurchaseOrderDraftItem {
  key: string;
  part: PartRef;
  quantityOrdered: number;
  unitCost: number;
  gstRate: number;
}

interface PurchaseOrderItemsBuilderProps {
  items: PurchaseOrderDraftItem[];
  onChange: (items: PurchaseOrderDraftItem[]) => void;
}

/**
 * Purely client-side row builder — PurchaseOrderItems are fixed at PO
 * creation (no add/edit/remove-item endpoint exists once a PO is
 * created, see CreatePurchaseOrderDto's doc comment), so unlike
 * EstimateLineItems/JobCardLabourLines this never calls the API per row —
 * the whole array is submitted together in one POST /purchase-orders.
 */
export function PurchaseOrderItemsBuilder({ items, onChange }: PurchaseOrderItemsBuilderProps) {
  const [picked, setPicked] = useState<PartRef | null>(null);
  const [quantityOrdered, setQuantityOrdered] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [gstRate, setGstRate] = useState('18');

  const total = items.reduce((sum, i) => sum + i.quantityOrdered * i.unitCost, 0);

  function handleAddRow() {
    if (!picked) return;
    onChange([
      ...items,
      {
        key: `${picked.id}-${Date.now()}`,
        part: picked,
        quantityOrdered: Number(quantityOrdered) || 1,
        unitCost: Number(unitCost) || 0,
        gstRate: Number(gstRate) || 0,
      },
    ]);
    setPicked(null);
    setQuantityOrdered('1');
    setUnitCost('');
    setGstRate('18');
  }

  function handleRemoveRow(key: string) {
    onChange(items.filter((i) => i.key !== key));
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">No items added yet.</p>
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Part</TableHeaderCell>
              <TableHeaderCell>Qty</TableHeaderCell>
              <TableHeaderCell>Unit Cost</TableHeaderCell>
              <TableHeaderCell>GST %</TableHeaderCell>
              <TableHeaderCell>Line Total</TableHeaderCell>
              <TableHeaderCell className="w-16" />
            </tr>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.key}>
                <TableCell>
                  {item.part.partNumber} <span className="text-ink-muted">— {item.part.name}</span>
                </TableCell>
                <TableCell className="num">{item.quantityOrdered}</TableCell>
                <TableCell className="num">{formatMoney(item.unitCost)}</TableCell>
                <TableCell className="num">{item.gstRate}%</TableCell>
                <TableCell className="num font-medium">{formatMoney(item.quantityOrdered * item.unitCost)}</TableCell>
                <TableCell className="text-right">
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(item.key)}
                    className="text-xs text-danger-600 hover:underline dark:text-danger-400"
                  >
                    Remove
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <p className="num text-right text-sm font-medium text-ink">Subtotal (excl. GST): {formatMoney(total)}</p>

      <div className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
        <PartPicker value={picked} onChange={setPicked} />
        <Input
          type="number"
          value={quantityOrdered}
          onChange={(e) => setQuantityOrdered(e.target.value)}
          className="h-9 w-20"
          aria-label="Quantity"
        />
        <Input
          type="number"
          value={unitCost}
          onChange={(e) => setUnitCost(e.target.value)}
          placeholder="Unit cost"
          className="h-9 w-28"
          aria-label="Unit cost"
        />
        <Input
          type="number"
          value={gstRate}
          onChange={(e) => setGstRate(e.target.value)}
          placeholder="GST %"
          className="h-9 w-20"
          aria-label="GST rate"
        />
        <Button type="button" variant="secondary" size="sm" onClick={handleAddRow} disabled={!picked}>
          Add Row
        </Button>
      </div>
    </div>
  );
}
