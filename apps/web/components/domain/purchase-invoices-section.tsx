'use client';

import { useState } from 'react';
import { apiPost, ApiError } from '@/lib/api-client';
import { formatDate, formatMoney } from '@/lib/format';
import type { PurchaseInvoice, PurchaseInvoiceStatus } from '@/lib/api-types';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

const STATUS_TONE: Record<PurchaseInvoiceStatus, 'neutral' | 'warning' | 'success'> = {
  UNPAID: 'neutral',
  PARTIALLY_PAID: 'warning',
  PAID: 'success',
};

interface PurchaseInvoicesSectionProps {
  purchaseOrderId: string;
  canCreate: boolean;
  invoices: PurchaseInvoice[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onRecorded: () => void;
}

function RecordPaymentForm({ invoiceId, onRecorded }: { invoiceId: string; onRecorded: () => void }) {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit() {
    if (!amount || !paymentDate) {
      setError('Amount and payment date are required.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await apiPost('/supplier-payments', {
        purchaseInvoiceId: invoiceId,
        amount: Number(amount),
        paymentDate,
        method,
        referenceNumber: referenceNumber || undefined,
      });
      setAmount('');
      setPaymentDate('');
      setReferenceNumber('');
      setIsOpen(false);
      onRecorded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not record payment.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(true)}>
        Record Payment
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded border border-line bg-surface-hover p-3">
      <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="h-9 w-28" />
      <DatePicker value={paymentDate} onChange={setPaymentDate} className="h-9 w-40" />
      <Input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Method" className="h-9 w-32" />
      <Input
        value={referenceNumber}
        onChange={(e) => setReferenceNumber(e.target.value)}
        placeholder="Reference #"
        className="h-9 w-32"
      />
      <Button type="button" size="sm" onClick={handleSubmit} isLoading={isSaving}>
        Save
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      {error ? <span className="w-full text-xs text-danger-600 dark:text-danger-400">{error}</span> : null}
    </div>
  );
}

function RecordInvoiceForm({ purchaseOrderId, onRecorded }: { purchaseOrderId: string; onRecorded: () => void }) {
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [subtotal, setSubtotal] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [total, setTotal] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!supplierInvoiceNumber || !invoiceDate) {
      setError('Supplier invoice number and date are required.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await apiPost('/purchase-invoices', {
        purchaseOrderId,
        supplierInvoiceNumber,
        invoiceDate,
        subtotal: Number(subtotal) || 0,
        taxAmount: Number(taxAmount) || 0,
        total: Number(total) || 0,
      });
      setSupplierInvoiceNumber('');
      setInvoiceDate('');
      setSubtotal('');
      setTaxAmount('');
      setTotal('');
      onRecorded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not record invoice.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <p className="text-xs font-medium text-ink-secondary">Record a purchase invoice from the supplier</p>
      <div className="flex flex-wrap items-end gap-2">
        <Input
          value={supplierInvoiceNumber}
          onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
          placeholder="Supplier invoice #"
          className="h-9 w-40"
        />
        <DatePicker value={invoiceDate} onChange={setInvoiceDate} className="h-9 w-40" />
        <Input type="number" value={subtotal} onChange={(e) => setSubtotal(e.target.value)} placeholder="Subtotal" className="h-9 w-28" />
        <Input type="number" value={taxAmount} onChange={(e) => setTaxAmount(e.target.value)} placeholder="Tax" className="h-9 w-24" />
        <Input type="number" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="Total" className="h-9 w-28" />
        <Button type="button" variant="secondary" size="sm" onClick={handleSubmit} isLoading={isSaving}>
          Record Invoice
        </Button>
      </div>
      {error ? <span className="text-xs text-danger-600 dark:text-danger-400">{error}</span> : null}
    </div>
  );
}

/**
 * Nests both the supplier-invoice-recording flow and per-invoice payment
 * recording (the spec's "Supplier Payment" concept always exists in the
 * context of one specific invoice, so it's shown there rather than as a
 * separate, disconnected card) — no separate top-level nav for either,
 * since both are always viewed in the context of a purchase order. Data
 * is owned by the parent detail page (not fetched here) so the page can
 * share the same invoices/payments with the Order Progress stepper
 * without a second, duplicate request.
 */
export function PurchaseInvoicesSection({ purchaseOrderId, canCreate, invoices, isLoading, error, onRetry, onRecorded }: PurchaseInvoicesSectionProps) {
  return (
    <Card id="invoices">
      <CardHeader>
        <CardTitle>Purchase Invoice &amp; Supplier Payment</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        {isLoading ? <Skeleton className="h-10 w-full" /> : null}
        {error ? <ErrorState message={error} onRetry={onRetry} /> : null}
        {!isLoading && !error && invoices.length === 0 ? (
          <p className="text-sm text-ink-muted">No purchase invoice recorded yet.</p>
        ) : null}
        {invoices.length > 0 ? (
          <ul className="flex flex-col divide-y divide-line">
            {invoices.map((invoice) => {
              const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
              return (
                <li key={invoice.id} className="flex flex-col gap-2 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink">
                      {invoice.supplierInvoiceNumber} <span className="text-ink-muted">· {formatDate(invoice.invoiceDate)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="num text-sm text-ink">{formatMoney(invoice.total)}</span>
                      <Badge tone={STATUS_TONE[invoice.status]}>{invoice.status.replace('_', ' ').toLowerCase()}</Badge>
                    </span>
                  </div>
                  {invoice.payments.length > 0 ? (
                    <ul className="flex flex-col gap-1 pl-3">
                      {invoice.payments.map((p) => (
                        <li key={p.id} className="num flex justify-between text-xs text-ink-muted">
                          <span>
                            {formatDate(p.paymentDate)} · {p.method}
                          </span>
                          <span>{formatMoney(p.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {canCreate && invoice.status !== 'PAID' ? (
                    <div className="flex items-center gap-2 pl-3">
                      <span className="num text-xs text-ink-muted">
                        Outstanding: {formatMoney(Number(invoice.total) - paid)}
                      </span>
                      <RecordPaymentForm invoiceId={invoice.id} onRecorded={onRecorded} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}

        {canCreate ? <RecordInvoiceForm purchaseOrderId={purchaseOrderId} onRecorded={onRecorded} /> : null}
      </CardBody>
    </Card>
  );
}
