'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Download, Link2, Send } from 'lucide-react';
import { apiGet, apiGetBlob, apiPost, ApiError } from '@/lib/api-client';
import { downloadBlob } from '@/lib/export/csv';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { formatDate, formatMoney } from '@/lib/format';
import type { DeliveryChannel, DeliveryStatus, InvoiceDetail, PaymentMethod } from '@/lib/api-types';
import { InvoiceStatusBadge } from '@/components/domain/invoice-status-badge';
import { RecordPaymentForm } from '@/components/domain/record-payment-form';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const CHANNEL_LABEL: Record<DeliveryChannel, string> = {
  EMAIL: 'Email',
  SMS: 'SMS',
  WHATSAPP: 'WhatsApp',
  SLACK: 'Slack',
};

function summarizeSendAttempts(attempts: { channel: DeliveryChannel; status: DeliveryStatus }[]): {
  tone: 'success' | 'warning' | 'danger';
  message: string;
} {
  const sent = attempts.filter((a) => a.status === 'SENT').map((a) => CHANNEL_LABEL[a.channel]);
  const failed = attempts.filter((a) => a.status === 'FAILED').map((a) => CHANNEL_LABEL[a.channel]);
  const skipped = attempts.every((a) => a.status === 'SKIPPED');

  if (skipped) {
    return {
      tone: 'warning',
      message: 'Not sent — no Email/SMS/WhatsApp provider is configured, or this customer has no email or mobile on file.',
    };
  }
  if (sent.length > 0 && failed.length === 0) {
    return { tone: 'success', message: `Sent via ${sent.join(' and ')}.` };
  }
  if (sent.length > 0 && failed.length > 0) {
    return { tone: 'warning', message: `Sent via ${sent.join(', ')} — ${failed.join(', ')} failed.` };
  }
  return { tone: 'danger', message: `Could not send via ${failed.join(', ')}.` };
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  credit: 'Credit',
  razorpay: 'Razorpay',
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
  const canSend = usePermission('invoice:read');
  // Same permission as manual payment recording, matching the backend's
  // POST /invoices/:id/payment-link gate — anyone who can record a payment
  // can also generate/send a link for one.
  const canSendPaymentLink = usePermission('payment:create');

  const query = useApiQuery<InvoiceDetail>(() => apiGet(`/invoices/${params.id}`), [params.id]);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ tone: 'success' | 'warning' | 'danger'; message: string } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [linkResult, setLinkResult] = useState<{ tone: 'success' | 'warning' | 'danger'; message: string } | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  async function handleSend() {
    setIsSending(true);
    setSendError(null);
    setSendResult(null);
    try {
      const result = await apiPost<{ attempts: { channel: DeliveryChannel; status: DeliveryStatus }[] }>(
        `/invoices/${params.id}/send`,
      );
      setSendResult(summarizeSendAttempts(result.attempts));
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : 'Could not send the invoice.');
    } finally {
      setIsSending(false);
    }
  }

  // Independent of Email/SMS/WhatsApp — this is the fallback when nothing
  // is configured or the customer has no email/mobile on file: the owner
  // can always grab the PDF directly instead of depending on delivery.
  async function handleDownload() {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const blob = await apiGetBlob(`/invoices/${params.id}/pdf`);
      downloadBlob(blob, `${query.data?.invoiceNumber ?? 'invoice'}.pdf`);
    } catch (err) {
      setDownloadError(err instanceof ApiError ? err.message : 'Could not download the invoice.');
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleSendPaymentLink() {
    setIsSendingLink(true);
    setLinkError(null);
    setLinkResult(null);
    try {
      const result = await apiPost<{ attempts: { channel: DeliveryChannel; status: DeliveryStatus }[] }>(
        `/invoices/${params.id}/payment-link`,
      );
      setLinkResult(summarizeSendAttempts(result.attempts));
      query.refetch(); // picks up the invoice's new pendingGatewayOrderId, if that ever needs surfacing later
    } catch (err) {
      setLinkError(err instanceof ApiError ? err.message : 'Could not send the payment link.');
    } finally {
      setIsSendingLink(false);
    }
  }

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="num text-2xl font-semibold text-ink">{invoice.invoiceNumber}</h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-ink-secondary">{formatDate(invoice.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          {canSend ? (
            <Button variant="secondary" size="sm" onClick={handleDownload} isLoading={isDownloading}>
              <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Download PDF
            </Button>
          ) : null}
          {canSend ? (
            <Button variant="secondary" size="sm" onClick={handleSend} isLoading={isSending}>
              <Send className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Send Invoice
            </Button>
          ) : null}
          {canSendPaymentLink && outstanding > 0 ? (
            <Button variant="secondary" size="sm" onClick={handleSendPaymentLink} isLoading={isSendingLink}>
              <Link2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Send Payment Link
            </Button>
          ) : null}
          <Link href="/invoices" className="text-sm text-ink-secondary hover:text-ink">
            &larr; Back to invoices
          </Link>
        </div>
      </div>

      {downloadError ? <ErrorState message={downloadError} /> : null}
      {sendError ? <ErrorState message={sendError} /> : null}
      {linkError ? <ErrorState message={linkError} /> : null}
      {linkResult ? (
        <p
          className={
            linkResult.tone === 'success'
              ? 'rounded border border-success-100 bg-success-50 px-3 py-2 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400'
              : linkResult.tone === 'warning'
                ? 'rounded border border-warning-100 bg-warning-50 px-3 py-2 text-sm text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400'
                : 'rounded border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400'
          }
        >
          {linkResult.message}
        </p>
      ) : null}
      {sendResult ? (
        <p
          className={
            sendResult.tone === 'success'
              ? 'rounded border border-success-100 bg-success-50 px-3 py-2 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400'
              : sendResult.tone === 'warning'
                ? 'rounded border border-warning-100 bg-warning-50 px-3 py-2 text-sm text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400'
                : 'rounded border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400'
          }
        >
          {sendResult.message}
        </p>
      ) : null}

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
