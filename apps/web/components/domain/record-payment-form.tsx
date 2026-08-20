'use client';

import { useState, type FormEvent } from 'react';
import { apiPost, ApiError } from '@/lib/api-client';
import { validatePaymentForm, type PaymentFormErrors } from '@/lib/validation/payment';
import type { InvoiceDetail, PaymentMethod } from '@/lib/api-types';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  credit: 'Credit',
};

interface RecordPaymentFormProps {
  invoiceId: string;
  onRecorded: (invoice: InvoiceDetail) => void;
}

export function RecordPaymentForm({ invoiceId, onRecorded }: RecordPaymentFormProps) {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [errors, setErrors] = useState<PaymentFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = validatePaymentForm({
      amount: Number(amount),
      paymentDate: paymentDate || undefined,
      method,
      referenceNumber: referenceNumber || undefined,
    });
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      const invoice = await apiPost<InvoiceDetail>(`/invoices/${invoiceId}/payments`, result.data);
      setAmount('');
      setPaymentDate('');
      setReferenceNumber('');
      onRecorded(invoice);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 border-t border-line pt-4">
      <p className="text-xs font-medium text-ink-secondary">Record a payment</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          error={errors.amount}
        />
        <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} error={errors.method}>
          {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => (
            <option key={m} value={m}>
              {METHOD_LABEL[m]}
            </option>
          ))}
        </Select>
        <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} error={errors.paymentDate} />
        <Input
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          placeholder="Reference #"
          error={errors.referenceNumber}
        />
      </div>
      {formError ? (
        <p
          role="alert"
          className="rounded border border-danger-100 bg-danger-50 px-3 py-2 text-xs text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400"
        >
          {formError}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" size="sm" isLoading={isSubmitting}>
          Record Payment
        </Button>
      </div>
    </form>
  );
}
