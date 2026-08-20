'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { formatDate, formatMoney } from '@/lib/format';
import type { InvoiceDetail, PaymentMethod } from '@/lib/api-types';
import { InvoiceStatusBadge } from '@/components/domain/invoice-status-badge';
import { RecordPaymentForm } from '@/components/domain/record-payment-form';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  credit: 'Credit',
};

function SummaryRow({ label, value, emphasized }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={emphasized ? 'text-sm font-medium text-ink' : 'text-sm text-ink-secondary'}>{label}</span>
      <span className={emphasized ? 'num text-base font-semibold text-ink' : 'num text-sm text-ink'}>{value}</span>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const canRecordPayment = usePermission('payment:create');

  const query = useApiQuery<InvoiceDetail>(() => apiGet(`/invoices/${params.id}`), [params.id]);

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.error) {
    return <ErrorState message={query.error} onRetry={query.refetch} />;
  }

  const invoice = query.data;
  if (!invoice) return null;

  const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const outstanding = Number(invoice.grandTotal) - totalPaid;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="num text-2xl font-semibold text-ink">{invoice.invoiceNumber}</h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-ink-secondary">{formatDate(invoice.createdAt)}</p>
        </div>
        <Link href="/invoices" className="self-center text-sm text-ink-secondary hover:text-ink">
          &larr; Back to invoices
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href={`/customers/${invoice.customer.id}`}
          className="flex flex-col gap-0.5 rounded-lg border border-line bg-surface px-4 py-3 shadow-card hover:border-accent-400"
        >
          <span className="text-sm font-medium text-ink">{invoice.customer.name}</span>
          <span className="num text-xs text-ink-muted">{invoice.customer.mobile}</span>
        </Link>
        {invoice.jobCard ? (
          <Link
            href={`/job-cards/${invoice.jobCard.id}`}
            className="flex flex-col gap-0.5 rounded-lg border border-line bg-surface px-4 py-3 shadow-card hover:border-accent-400"
          >
            <span className="num text-sm font-medium text-ink">{invoice.jobCard.jobCardNumber}</span>
            <span className="text-xs text-ink-muted">Source job card</span>
          </Link>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardBody>
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Description</TableHeaderCell>
                <TableHeaderCell>HSN/SAC</TableHeaderCell>
                <TableHeaderCell>Qty</TableHeaderCell>
                <TableHeaderCell>Unit Price</TableHeaderCell>
                <TableHeaderCell>GST %</TableHeaderCell>
                <TableHeaderCell>Line Total</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {invoice.lineItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="num text-ink-secondary">{item.hsnSac ?? '—'}</TableCell>
                  <TableCell className="num">{item.quantity}</TableCell>
                  <TableCell className="num">{formatMoney(item.unitPrice)}</TableCell>
                  <TableCell className="num">{item.gstRate}%</TableCell>
                  <TableCell className="num font-medium">{formatMoney(item.lineTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>GST Summary</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-2">
            <SummaryRow label="Subtotal" value={formatMoney(invoice.subtotal)} />
            <SummaryRow label="CGST" value={formatMoney(invoice.cgstAmount)} />
            <SummaryRow label="SGST" value={formatMoney(invoice.sgstAmount)} />
            <SummaryRow label="IGST" value={formatMoney(invoice.igstAmount)} />
            <SummaryRow label="Round Off" value={formatMoney(invoice.roundOff)} />
            <div className="border-t border-line pt-2">
              <SummaryRow label="Grand Total" value={formatMoney(invoice.grandTotal)} emphasized />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <SummaryRow label="Paid" value={formatMoney(totalPaid)} />
              <SummaryRow label="Outstanding" value={formatMoney(outstanding)} emphasized />
            </div>

            {invoice.payments.length === 0 ? (
              <p className="text-sm text-ink-muted">No payments recorded yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {invoice.payments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-ink">
                      {formatDate(payment.paymentDate)} · {METHOD_LABEL[payment.method]}
                      {payment.referenceNumber ? <span className="text-ink-muted"> ({payment.referenceNumber})</span> : null}
                    </span>
                    <span className="num text-ink">{formatMoney(payment.amount)}</span>
                  </li>
                ))}
              </ul>
            )}

            {canRecordPayment && invoice.status !== 'PAID' && invoice.status !== 'REFUNDED' ? (
              <RecordPaymentForm invoiceId={invoice.id} onRecorded={() => query.refetch()} />
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
